import { faker } from "@faker-js/faker";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { hashPassword } from "../lib/passwordSecurity";
import { calculateQuote } from "../lib/calculateQuote";
import { SERVICES } from "../lib/services";

// run this script via `npx tsx src/prisma/seed.ts` or `npm run seed` to automatically seed the backend database with fresh data (for testing and demo only; not for use during "real" deployments)
// WARNING: running the script will overwrite all pre-existing data in the database

faker.seed(42); // fixed seed instead of pure random for the sake of easier testing. change the seed to get different "random" values

const DEMO_PASSWORD = "Demo1234!";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

type BStatus = "Pending" | "Quoted" | "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "Rejected";
type PStatus = "Pending" | "Paid" | "Failed" | "Refunded";
type Method = "Card" | "Cash" | "Bank Transfer";

// specifications for a booking and everything related to it
type Spec = {
    day: number; // days from today (negative numbers means it's in the past)
    hour: number;
    min?: number;
    customer: number;
    services: string[]; // Service ids
    size: number; // measured in square ft
    status: BStatus;
    staff: number[];
    assignment?: "Assigned" | "Accepted";
    pay?: PStatus;
    method?: Method;
    discount?: number;
    addOns?: { description: string; amount: number }[]; // extra priced quote lines in cents, same shape as QuoteLineItem from the quotation type
};

const SPECS: Spec[] = [
    // today's operations
    { day: 0, hour: 9, customer: 0, services: ["basic"], size: 900, status: "Confirmed", staff: [0], assignment: "Accepted" },
    { day: 0, hour: 11, min: 30, customer: 1, services: ["deep"], size: 1500, status: "In Progress", staff: [1], assignment: "Accepted", pay: "Pending", method: "Cash" },
    {
        day: 0, hour: 14, customer: 2, services: ["sofa", "mattress"], size: 1100, status: "Confirmed", staff: [2], assignment: "Assigned",
        addOns: [
            { description: "Pet Hair Removal", amount: 1500 },
            { description: "Crawl Space Dusting", amount: 2500 },
        ]
    },
    // past
    { day: -2, hour: 10, customer: 3, services: ["basic"], size: 800, status: "Completed", staff: [0], assignment: "Accepted", pay: "Paid", method: "Card" },
    {
        day: -5, hour: 13, customer: 4, services: ["deep", "mattress"], size: 1800, status: "Completed", staff: [1, 2], assignment: "Accepted", pay: "Paid", method: "Card", discount: 1000,
        addOns: [
            { description: "Window Cleaning", amount: 2000 },
            { description: "Inside Oven", amount: 500 },
            { description: "Balcony Cleaning", amount: 1800 },
        ]
    },
    { day: -8, hour: 16, customer: 5, services: ["mattress"], size: 900, status: "Completed", staff: [4], assignment: "Accepted", pay: "Pending", method: "Cash" },
    {
        day: -9, hour: 9, customer: 5, services: ["office"], size: 2400, status: "Completed", staff: [2], assignment: "Accepted", pay: "Paid", method: "Bank Transfer",
        addOns: [
            { description: "Carpet Shampoo", amount: 4000 },
            { description: "Window Cleaning", amount: 3000 },
            { description: "Disinfection Treatment", amount: 3500 },
            { description: "Trash Removal", amount: 1000 },
        ]
    },
    { day: -14, hour: 15, customer: 0, services: ["basic"], size: 900, status: "Completed", staff: [0], assignment: "Accepted", pay: "Paid", method: "Cash" },
    {
        day: -20, hour: 10, customer: 1, services: ["move-out"], size: 1600, status: "Completed", staff: [3], assignment: "Accepted", pay: "Paid", method: "Card",
        addOns: [{ description: "Wall Spot Cleaning", amount: 2200 }]
    },
    { day: -30, hour: 11, customer: 2, services: ["sofa"], size: 1000, status: "Completed", staff: [4], assignment: "Accepted", pay: "Paid", method: "Card", discount: 500 },
    { day: -45, hour: 14, customer: 3, services: ["deep"], size: 1300, status: "Completed", staff: [1], assignment: "Accepted", pay: "Paid", method: "Card" },
    { day: -60, hour: 9, customer: 4, services: ["basic"], size: 850, status: "Cancelled", staff: [0], assignment: "Accepted", pay: "Refunded", method: "Card" },
    // upcoming
    { day: 2, hour: 10, customer: 0, services: ["renovation"], size: 2000, status: "Pending", staff: [] },
    { day: 5, hour: 13, customer: 1, services: ["move-in"], size: 1400, status: "Quoted", staff: [] },
    { day: 10, hour: 9, customer: 5, services: ["basic", "sofa"], size: 1000, status: "Confirmed", staff: [], pay: "Failed", method: "Card" },
    { day: 20, hour: 11, customer: 3, services: ["other"], size: 700, status: "Rejected", staff: [] },
];

// statuses a booking has passed through, in order (provides a status history)
const CHAIN: Record<BStatus, BStatus[]> = {
    Pending: ["Pending"],
    Quoted: ["Pending", "Quoted"],
    Confirmed: ["Pending", "Quoted", "Confirmed"],
    "In Progress": ["Pending", "Quoted", "Confirmed", "In Progress"],
    Completed: ["Pending", "Quoted", "Confirmed", "In Progress", "Completed"],
    Cancelled: ["Pending", "Quoted", "Confirmed", "Cancelled"],
    Rejected: ["Pending", "Rejected"],
};

const HAS_QUOTE: BStatus[] = ["Quoted", "Confirmed", "In Progress", "Completed", "Cancelled"];

// converts staff names into email addresses
const slug = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

function dayAt(offset: number, hour: number, min = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(hour, min, 0, 0);
    return d;
}

// gives the prices for a quotation
function priceOf(serviceId: string): number {
    const s = SERVICES.find((x) => x.id === serviceId);
    if (!s) throw new Error(`Unknown service id: ${serviceId}`);

    if (s.basePrice === null) return faker.number.int({ min: 5000, max: 40000, multipleOf: 100 }); // quotation-priced services are given a random price between $50 and $400, incremented by $10
    if (s.pricingType === "hourly") return s.basePrice * faker.number.int({ min: 1, max: 8 }); // hourly-priced services are given a random number of hours between 1-8 inclusive
    return s.basePrice; // fixed-price
}

async function main() {
    // clears out all data in each table before seeding with new data (to avoid clutter and make testing easier)
    await db.orm.public.MCNotification.where({}).deleteAll();
    await db.orm.public.Payment.where({}).deleteAll();
    await db.orm.public.QuoteAddOn.where({}).deleteAll();
    await db.orm.public.QuoteServiceLine.where({}).deleteAll();
    await db.orm.public.Quotation.where({}).deleteAll();
    await db.orm.public.StatusHistory.where({}).deleteAll();
    await db.orm.public.BookingAssignment.where({}).deleteAll();
    await db.orm.public.Booking.where({}).deleteAll();
    await db.orm.public.Customer.where({}).deleteAll();
    await db.orm.public.Staff.where({}).deleteAll();
    await db.orm.public.User.where({}).deleteAll();

    const passwordHash = await hashPassword(DEMO_PASSWORD);

    // admin (just one, but there can be more)
    const admin = await db.orm.public.User.create({
        name: "Admin",
        email: "admin@microclean.test",
        passwordHash,
        role: "admin",
    });

    // staff (user + profile)
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const staffSeeds = [
        { name: "John Smith", skills: ["basic", "mattress", "sofa"], years: 5, rating: 4.8, status: "Available" as const, isActive: true },
        { name: "Zohran Mamdani", skills: ["deep", "renovation", "move-out"], years: 7, rating: 4.6, status: "Busy" as const, isActive: true },
        { name: `${faker.person.firstName()} ${faker.person.lastName()}`, skills: ["basic", "deep", "office"], years: 3, rating: 4.5, status: "Assigned" as const, isActive: true },
        { name: `${faker.person.firstName()} ${faker.person.lastName()}`, skills: ["move-in", "move-out", "other"], years: 4, rating: 4.2, status: "Offline" as const, isActive: true },
        { name: `${faker.person.firstName()} ${faker.person.lastName()}`, skills: ["sofa", "mattress", "basic"], years: 2, rating: 4.0, status: "Available" as const, isActive: false },
    ];

    const completedPerStaff = staffSeeds.map((_, i) =>
        SPECS.filter((s) => s.status === "Completed" && s.staff.includes(i)).length
    );

    const staffIds: string[] = [];
    for (const [i, s] of staffSeeds.entries()) {
        const user = await db.orm.public.User.create({
            name: s.name,
            email: `${slug(s.name)}@microclean.test`,
            passwordHash,
            role: "staff",
        });
        const staff = await db.orm.public.Staff.create({
            phone: `555-02${String(i + 1).padStart(2, "0")}`,
            avatar: null,
            skills: s.skills,
            experienceYears: s.years,
            availability: faker.helpers.arrayElements(days, { min: 4, max: 6 }),
            rating: s.rating,
            completedJobs: completedPerStaff[i],
            status: s.status,
            isActive: s.isActive,
            userId: user.id,
        });
        staffIds.push(staff.id);
    }

    // customers
    const customerNames = [
        "Ryo Yamada",
        "Agnes Tachyon",
        ...Array.from({ length: 4 }, () => `${faker.person.firstName()} ${faker.person.lastName()}`),
    ];
    const customers = [];
    for (const [i, name] of customerNames.entries()) {
        customers.push(
            await db.orm.public.Customer.create({
                name,
                email: `${slug(name)}@example.com`,
                phone: `555-01${String(i + 1).padStart(2, "0")}`,
                address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
            })
        );
    }

    // bookings and everything derived from them
    for (const [i, spec] of SPECS.entries()) {
        const id = `MC-${1001 + i}`;
        const customer = customers[spec.customer];
        const scheduled = dayAt(spec.day, spec.hour, spec.min ?? 0);
        const created = new Date(Math.min(scheduled.getTime() - 6 * DAY, Date.now() - 3 * DAY));

        const timeOf: Record<BStatus, Date> = {
            Pending: created,
            Quoted: new Date(created.getTime() + 12 * HOUR),
            Confirmed: new Date(created.getTime() + 48 * HOUR),
            "In Progress": scheduled,
            Completed: new Date(scheduled.getTime() + 3 * HOUR),
            Cancelled: new Date(created.getTime() + 72 * HOUR),
            Rejected: new Date(created.getTime() + 12 * HOUR),
        };
        const staffName = spec.staff.length ? staffSeeds[spec.staff[0]].name : "Admin";
        const changedBy: Record<BStatus, string> = {
            Pending: "Customer",
            Quoted: "Admin",
            Confirmed: "Customer",
            "In Progress": staffName,
            Completed: staffName,
            Cancelled: "Admin",
            Rejected: "Admin",
        };

        await db.orm.public.Booking.create({
            id,
            customerId: customer.id,
            serviceIds: spec.services,
            scheduledAt: scheduled,
            address: customer.address,
            propertySize: spec.size,
            accessNotes: i % 3 === 0 ? "Park in the visitor lot, ring the bell twice" : null,
            specialNotes: i % 4 === 0 ? "Give extra attention to the kitchen" : null,
            pets: i % 5 === 0,
            status: spec.status,
            createdAt: created,
        });

        await db.orm.public.StatusHistory.createAll(
            CHAIN[spec.status].map((status) => ({
                bookingId: id,
                status,
                changedAt: timeOf[status],
                changedBy: changedBy[status],
                note: null,
            }))
        );

        if (spec.staff.length) {
            await db.orm.public.BookingAssignment.createAll(
                spec.staff.map((si) => ({
                    bookingId: id,
                    staffId: staffIds[si],
                    status: spec.assignment ?? "Assigned",
                }))
            );
        }

        // quotations
        let total = 0;
        if (HAS_QUOTE.includes(spec.status)) {
            const lines = spec.services.map((serviceId) => ({ serviceId, price: priceOf(serviceId) }));
            const addOns = [
                { description: `${spec.size} sq ft`, amount: spec.size * 5 },
                ...(spec.addOns ?? []),
            ];
            const discount = spec.discount ?? 0;
            const taxRate = 0.06;
            total = calculateQuote({ services: lines, addOns, discount, taxRate }).total;

            const quote = await db.orm.public.Quotation.create({
                bookingId: id,
                token: randomBytes(16).toString("hex"),
                discount,
                taxRate,
                total,
                expiresAt: new Date(timeOf.Quoted.getTime() + 14 * DAY),
                notes: null,
                status: spec.status === "Quoted" ? "Sent" : "Accepted",
                createdAt: timeOf.Quoted,
            });
            await db.orm.public.QuoteServiceLine.createAll(lines.map((l) => ({ quotationId: quote.id, ...l })));
            await db.orm.public.QuoteAddOn.createAll(addOns.map((a) => ({ quotationId: quote.id, ...a })));
        }

        // payment
        const paidAt = spec.pay === "Paid" || spec.pay === "Refunded" ? new Date(timeOf.Confirmed.getTime() + HOUR) : null;
        if (spec.pay) {
            await db.orm.public.Payment.create({
                bookingId: id,
                amount: total,
                method: spec.method ?? "Card",
                status: spec.pay,
                paidAt,
                createdAt: timeOf.Confirmed,
            });
        }

        // admin notifications
        const events: { type: string; at: Date; message: string }[] = [
            { type: "BookingRequested", at: created, message: `New booking request ${id} from ${customer.name}` },
        ];
        if (CHAIN[spec.status].includes("Confirmed"))
            events.push({ type: "QuoteAccepted", at: timeOf.Confirmed, message: `${customer.name} accepted the quote for ${id}` });
        if (spec.assignment === "Accepted")
            events.push({ type: "StaffAccepted", at: new Date(timeOf.Confirmed.getTime() + 3 * HOUR), message: `${staffName} accepted job ${id}` });
        if (spec.pay === "Paid" && paidAt)
            events.push({ type: "PaymentReceived", at: paidAt, message: `Payment received for ${id}` });
        if (spec.status === "Completed")
            events.push({ type: "BookingCompleted", at: timeOf.Completed, message: `Booking ${id} was completed` });
        if (spec.status === "Cancelled")
            events.push({ type: "BookingCancelled", at: timeOf.Cancelled, message: `Booking ${id} was cancelled` });

        await db.orm.public.MCNotification.createAll(
            events.map((e) => ({
                userId: admin.id,
                type: e.type as "BookingRequested",
                bookingId: id,
                message: e.message,
                isRead: e.at.getTime() < Date.now() - 2 * DAY,
                createdAt: e.at,
            }))
        );
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .then(() => process.exit(0));