import { getDb } from "../config/db.js";
import { ObjectId } from "mongodb";

/**
 * Owner Analytics
 * Returns metrics for the authenticated owner's equipment and bookings
 */
export const getOwnerAnalytics = async (req, res) => {
  try {
    const db = getDb();
    const ownerEmail = req.user.email; // from verifyToken middleware

    // Get all equipment IDs owned by this owner
    const equipmentCursor = db.collection("equipment").find({ "owner.email": ownerEmail });
    const ownerEquipment = await equipmentCursor.toArray();
    const equipmentIds = ownerEquipment.map((eq) => eq._id);

    // Total listed equipment
    const totalEquipment = ownerEquipment.length;

    // Completed rentals (bookings with bookingStatus = 'completed')
    const completedRentals = await db
      .collection("bookings")
      .countDocuments({
        equipmentId: { $in: equipmentIds },
        bookingStatus: "completed",
      });

    // Total earnings (sum of totalAmount for paid bookings)
    const earningsPipeline = [
      {
        $match: {
          equipmentId: { $in: equipmentIds },
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ];
    const earningsResult = await db
      .collection("bookings")
      .aggregate(earningsPipeline)
      .toArray();
    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].total : 0;

    // Monthly earnings chart (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    
    const monthlyEarningsPipeline = [
      {
        $match: {
          equipmentId: { $in: equipmentIds },
          paymentStatus: "paid",
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ];
    const monthlyEarningsData = await db
      .collection("bookings")
      .aggregate(monthlyEarningsPipeline)
      .toArray();

    // Format monthly data for chart (fill missing months with 0)
    const monthlyEarnings = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = monthlyEarningsData.find(
        (m) => m._id.year === year && m._id.month === month
      );
      monthlyEarnings.push({
        month: d.toLocaleString("en-BD", { month: "short" }),
        year,
        monthNum: month,
        earnings: found ? found.total : 0,
        bookings: found ? found.count : 0,
      });
    }

    // Equipment by status
    const equipmentByStatus = await db
      .collection("equipment")
      .aggregate([
        { $match: { "owner.email": ownerEmail } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    // Equipment by category
    const equipmentByCategory = await db
      .collection("equipment")
      .aggregate([
        { $match: { "owner.email": ownerEmail } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .toArray();

    // Recent bookings (last 5)
    const recentBookings = await db
      .collection("bookings")
      .find({ equipmentId: { $in: equipmentIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    res.json({
      success: true,
      data: {
        totalEquipment,
        completedRentals,
        totalEarnings,
        monthlyEarnings,
        equipmentByStatus: equipmentByStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        equipmentByCategory: equipmentByCategory.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
        recentBookings: recentBookings.map((b) => ({
          _id: b._id,
          equipmentName: b.equipment?.name,
          customerName: b.customer?.name,
          startDate: b.startDate,
          endDate: b.endDate,
          totalAmount: b.totalAmount,
          paymentStatus: b.paymentStatus,
          bookingStatus: b.bookingStatus,
        })),
      },
    });
  } catch (err) {
    console.error("Owner analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch owner analytics",
    });
  }
};

/**
 * Admin Analytics
 * Returns platform-wide metrics
 */
export const getAdminAnalytics = async (req, res) => {
  try {
    const db = getDb();

    // Total users by role
    const usersByRole = await db
      .collection("user")
      .aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ])
      .toArray();

    // Total equipment
    const totalEquipment = await db.collection("equipment").countDocuments();

    // Pending approvals
    const pendingApprovals = await db.collection("equipment").countDocuments({
      status: "pending",
    });

    // Total bookings
    const totalBookings = await db.collection("bookings").countDocuments();

    // Completed rentals
    const completedRentals = await db.collection("bookings").countDocuments({
      bookingStatus: "completed",
    });

    // Total revenue (sum of paid bookings)
    const revenueResult = await db
      .collection("bookings")
      .aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ])
      .toArray();
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Monthly booking stats (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    
    const monthlyBookingsPipeline = [
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ];
    const monthlyBookingsData = await db
      .collection("bookings")
      .aggregate(monthlyBookingsPipeline)
      .toArray();

    const monthlyBookings = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = monthlyBookingsData.find(
        (m) => m._id.year === year && m._id.month === month
      );
      monthlyBookings.push({
        month: d.toLocaleString("en-BD", { month: "short" }),
        year,
        monthNum: month,
        bookings: found ? found.total : 0,
        revenue: found ? found.revenue : 0,
      });
    }

    // Equipment by category
    const equipmentByCategory = await db
      .collection("equipment")
      .aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .toArray();

    // Equipment by status
    const equipmentByStatus = await db
      .collection("equipment")
      .aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    // Top 5 equipment by bookings
    const topEquipment = await db
      .collection("bookings")
      .aggregate([
        {
          $group: {
            _id: "$equipmentId",
            bookingCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "equipment",
            localField: "_id",
            foreignField: "_id",
            as: "equipment",
          },
        },
        { $unwind: "$equipment" },
        {
          $project: {
            _id: 1,
            name: "$equipment.name",
            category: "$equipment.category",
            bookingCount: 1,
            totalRevenue: 1,
          },
        },
      ])
      .toArray();

    // Recent users (last 5)
    const recentUsers = await db
      .collection("user")
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ name: 1, email: 1, role: 1, createdAt: 1 })
      .toArray();

    res.json({
      success: true,
      data: {
        totalUsers: usersByRole.reduce((sum, r) => sum + r.count, 0),
        usersByRole: usersByRole.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
        totalEquipment,
        pendingApprovals,
        totalBookings,
        completedRentals,
        totalRevenue,
        monthlyBookings,
        equipmentByCategory: equipmentByCategory.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
        equipmentByStatus: equipmentByStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        topEquipment,
        recentUsers,
      },
    });
  } catch (err) {
    console.error("Admin analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin analytics",
    });
  }
};