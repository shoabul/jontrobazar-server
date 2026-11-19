import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "jontrobazar";

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const col = db.collection("equipment");

  // Clear existing demo equipment (keep real owner data)
  await col.deleteMany({ "owner.email": "demo@owner.com" });

  const items = [
    {
      name: "CAT 320 Excavator",
      description:
        "20-ton hydraulic excavator with bucket and hydraulic hoses. Perfect for trenching, demolition, and earthmoving. Well maintained with recent service records.",
      category: "Construction",
      location: "Dhaka",
      price: 8500,
      rentalType: "daily",
      quantity: 2,
      condition: "good",
      brand: "CAT",
      model: "320",
      image:
        "https://images.unsplash.com/photo-1504198453319-5ce911b8c190?w=800&q=80",
      terms:
        "Operator not included. Fuel at renter cost. Delivery available within Dhaka city.",
      status: "approved",
      owner: { name: "Rahim Construction", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-10"),
      updatedAt: new Date(),
    },
    {
      name: "Sony FX6 Cinema Camera Kit",
      description:
        "Full-frame cinema camera with E-mount, 4K 120fps, 10-bit 4:2:2. Kit includes 2x BP-U70 batteries, 128GB CFexpress Type A, Sony 24-70mm f/2.8 GM lens, matte box, follow focus, and Pelican case.",
      category: "Photography",
      location: "Dhaka",
      price: 6500,
      rentalType: "daily",
      quantity: 3,
      condition: "excellent",
      brand: "Sony",
      model: "FX6",
      image:
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
      terms:
        "Security deposit 50,000 BDT (refundable). Renter must have production insurance.",
      status: "approved",
      owner: { name: "Cinema Gear BD", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-12"),
      updatedAt: new Date(),
    },
    {
      name: "Toyota Hilux 4x4 Double Cab",
      description:
        "2023 Toyota Hilux 2.8L diesel 4x4. AC, power steering, central locking, bed liner. Ideal for site transport and crew movement across Bangladesh.",
      category: "Vehicles & Transportation",
      location: "Chattogram",
      price: 4500,
      rentalType: "daily",
      quantity: 4,
      condition: "new",
      brand: "Toyota",
      model: "Hilux 2023",
      image:
        "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80",
      terms:
        "Driver optional (1,500 BDT/day extra). Fuel at renter cost. Inter-district travel allowed.",
      status: "approved",
      owner: { name: "Chittagong Fleet", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-05"),
      updatedAt: new Date(),
    },
    {
      name: "John Deere 5075E Tractor",
      description:
        "75 HP utility tractor with 4WD, power shuttle transmission, and rear PTO. Includes front loader attachment. Perfect for land prep, hauling, and mowing.",
      category: "Agriculture",
      location: "Rajshahi",
      price: 3200,
      rentalType: "daily",
      quantity: 1,
      condition: "good",
      brand: "John Deere",
      model: "5075E",
      image:
        "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80",
      terms:
        "Operator included. Diesel at owner cost. Minimum 3-day rental.",
      status: "approved",
      owner: { name: "AgriMach Rajshahi", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-08"),
      updatedAt: new Date(),
    },
    {
      name: "DJI Matrice 300 RTK Drone",
      description:
        "Industrial drone with Zenmuse H20T camera (thermal + zoom + wide), RTK module, 55-min max flight time. Ideal for surveying, inspection, mapping.",
      category: "Electronics",
      location: "Dhaka",
      price: 12000,
      rentalType: "daily",
      quantity: 2,
      condition: "excellent",
      brand: "DJI",
      model: "Matrice 300 RTK",
      image:
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80",
      terms:
        "Pilot certification required. Flight permits renter responsibility. Weather-dependent.",
      status: "approved",
      owner: { name: "AeroSurvey BD", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-15"),
      updatedAt: new Date(),
    },
    {
      name: "Portable Stage System 12x8m",
      description:
        "Modular aluminum stage system 12m x 8m with adjustable legs (0.6-1.2m), guardrails, stairs, and skirting. Includes 4x line array speakers, 2x subwoofers, mixer, and wireless mics.",
      category: "Event Equipment",
      location: "Sylhet",
      price: 25000,
      rentalType: "daily",
      quantity: 1,
      condition: "good",
      brand: "ProStage",
      model: "Modular 1208",
      image:
        "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
      terms:
        "Setup/teardown by owner crew included (15,000 BDT). Power distribution required. 2-day minimum.",
      status: "approved",
      owner: { name: "Sylhet Events", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-14"),
      updatedAt: new Date(),
    },
    {
      name: "Concrete Mixer 350L Diesel",
      description:
        "Heavy-duty 350L drum concrete mixer with Honda GX270 engine. Hydraulic tilt, towable. For foundations, slabs, and masonry work.",
      category: "Construction",
      location: "Gazipur",
      price: 1800,
      rentalType: "daily",
      quantity: 3,
      condition: "fair",
      brand: "Belle",
      model: "Mixer 350",
      image:
        "https://images.unsplash.com/photo-1590480055342-31b0f5f5c1a0?w=800&q=80",
      terms:
        "Fuel at renter cost. Towing available. Minimum 1-day rental.",
      status: "approved",
      owner: { name: "Gazipur Builders", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-02"),
      updatedAt: new Date(),
    },
    {
      name: "Canon C300 Mark III Cinema Camera",
      description:
        "Super 35mm 4K cinema camera with DGO sensor, 16+ stops DR, 4K 120fps. Kit: 2x CFexpress, 4x BP-A30, Canon 17-120mm cine servo, matte box, monitor.",
      category: "Photography",
      location: "Dhaka",
      price: 9500,
      rentalType: "daily",
      quantity: 1,
      condition: "excellent",
      brand: "Canon",
      model: "C300 Mark III",
      image:
        "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=800&q=80",
      terms:
        "Security deposit 80,000 BDT. Production insurance mandatory. Technician available.",
      status: "approved",
      owner: { name: "Cinema Gear BD", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-13"),
      updatedAt: new Date(),
    },
    {
      name: "Tata Intra V30 Pickup",
      description:
        "2024 Tata Intra V30 1.5L diesel, 1300kg payload, AC, power steering. Ideal for last-mile delivery and light construction material transport.",
      category: "Vehicles & Transportation",
      location: "Khulna",
      price: 2200,
      rentalType: "daily",
      quantity: 5,
      condition: "new",
      brand: "Tata",
      model: "Intra V30",
      image:
        "https://images.unsplash.com/photo-1544829085-137558911a6e?w=800&q=80",
      terms:
        "Driver optional (1,200 BDT/day). Fuel at renter. Within Khulna division only.",
      status: "approved",
      owner: { name: "Khulna Logistics", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-16"),
      updatedAt: new Date(),
    },
    {
      name: "Combine Harvester Kubota DC-68G",
      description:
        "68 HP self-propelled combine harvester, 2.0m cutting width, grain tank 1.6m3. For rice and wheat harvesting. Air-conditioned cabin.",
      category: "Agriculture",
      location: "Dinajpur",
      price: 15000,
      rentalType: "daily",
      quantity: 1,
      condition: "good",
      brand: "Kubota",
      model: "DC-68G",
      image:
        "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80",
      terms:
        "Operator + helper included. Fuel at owner cost. Minimum 5-day rental during harvest season.",
      status: "approved",
      owner: { name: "North Bengal Agri", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-09"),
      updatedAt: new Date(),
    },
    {
      name: "LED Video Wall 5m x 3m (P2.9)",
      description:
        "Indoor/outdoor rated LED video wall 5m x 3m, 2.9mm pixel pitch, 4500 nits, NovaStar controller. Includes rigging frame and processor.",
      category: "Electronics",
      location: "Dhaka",
      price: 18000,
      rentalType: "daily",
      quantity: 1,
      condition: "excellent",
      brand: "Absen",
      model: "PL 2.9",
      image:
        "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80",
      terms:
        "Technician for setup/calibration included. Power 3-phase required. 2-day min.",
      status: "approved",
      owner: { name: "AeroSurvey BD", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-11"),
      updatedAt: new Date(),
    },
    {
      name: "Tent & Marquee 20m x 10m",
      description:
        "Clearspan aluminum frame marquee 20m x 10m with PVC sidewalls, transparent window panels, flooring system, and chandelier lighting kit.",
      category: "Event Equipment",
      location: "Dhaka",
      price: 35000,
      rentalType: "daily",
      quantity: 1,
      condition: "good",
      brand: "Losberger",
      model: "De Boer 2010",
      image:
        "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
      terms:
        "Full setup/teardown by owner team (25,000 BDT). Level ground required. 3-day minimum.",
      status: "approved",
      owner: { name: "Sylhet Events", email: "demo@owner.com", photo: "" },
      createdAt: new Date("2026-11-07"),
      updatedAt: new Date(),
    },
  ];

  const result = await col.insertMany(items);
  console.log(`Inserted ${result.insertedCount} demo equipment items`);
  await client.close();
}
seed().catch(console.error);