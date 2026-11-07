import { faker } from "@faker-js/faker";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { hashPassword } from "../lib/passwordSecurity";
import { calculateQuote } from "../lib/calculateQuote";
import { SERVICES } from "../lib/services";

// run this script via `npx tsx src/prisma/seed.ts` or `npm run seed` to automatically seed the backend database with fresh data (for testing and demo only; not for use during "real" deployments)
// WARNING: running the script will overwrite all pre-existing data in the database

faker.seed(42); // same data on every run (as long as this file doesn't change)

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ??
    (() => {
        throw new Error("DEMO_PASSWORD is missing from .env");
    })(); // default password for all users in the seed data; loaded from .env (cannot run without it)

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// ---------- how much data ----------

const CUSTOMER_COUNT = 18;
const STAFF_COUNT = 15;
const BOOKING_COUNT = 48; // including the hardcoded ones

// ---------- types ----------

type BStatus = "Pending" | "Quoted" | "Confirmed" | "Assigned" | "In Progress" | "Completed" | "Cancelled" | "Rejected";
type PStatus = "Pending" | "Paid" | "Failed" | "Refunded";
type Method = "Card" | "Cash" | "Bank Transfer";
type StaffStatus = "Available" | "Assigned" | "Busy" | "Offline";
type NType =
    | "BookingRequested"
    | "QuoteAccepted"
    | "PaymentReceived"
    | "StaffAccepted"
    | "BookingCompleted"
    | "BookingCancelled";

// one scenario: the seed turns each into a booking plus its history, assignments, quote, payment, and notifications
type Spec = {
    day: number; // days from today (negative = past)
    hour: number;
    min?: number;
    customer: number; // index into customers
    services: string[]; // Service ids
    size: number; // sq ft
    status: BStatus;
    staff: number[]; // indexes into staff
    assignment?: "Assigned" | "Accepted"; // the status of every assignment on this booking
    staffRequired?: number; // defaults to 1
    pay?: PStatus;
    method?: Method;
    discount?: number; // cents
    addOns?: { description: string; amount: number }[]; // extra priced quote lines, in cents
};

// ---------- helpers ----------

const slug = (n: string) => n.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

// emails come from names, so every name has to be unique
const usedNames = new Set(["Sarah Tan", "Mike Torres", "John Doe", "Ahmed Khan"]);
function uniqueName(): string {
    let name: string;
    do name = `${faker.person.firstName()} ${faker.person.lastName()}`;
    while (usedNames.has(name));
    usedNames.add(name);
    return name;
}

function dayAt(offset: number, hour: number, min = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(hour, min, 0, 0);
    return d;
}

function priceOf(serviceId: string): number {
    const s = SERVICES.find((x) => x.id === serviceId);
    if (!s) throw new Error(`Unknown service id: ${serviceId}`);

    // quote-only service: random price from $50.00 to $400.00, in whole dollars
    if (s.basePrice === null) return faker.number.int({ min: 5000, max: 40000, multipleOf: 100 });

    // hourly service: rate times a random 1 to 8 hours
    if (s.pricingType === "hourly") return s.basePrice * faker.number.int({ min: 1, max: 8 });

    return s.basePrice; // fixed price
}

// ---------- staff (the first two are hardcoded, the rest are generated) ----------

const staffSeeds: {
    name: string;
    skills: string[];
    years: number;
    rating: number;
    status: StaffStatus;
    isActive: boolean;
}[] = [
        { name: "John Smith", skills: ["basic", "mattress", "sofa"], years: 5, rating: 4.8, status: "Available", isActive: true },
        { name: "Marker Plier", skills: ["deep", "renovation", "move-out"], years: 7, rating: 4.6, status: "Busy", isActive: true },
        ...Array.from({ length: STAFF_COUNT - 2 }, (_, i) => ({
            name: uniqueName(),
            skills: faker.helpers.arrayElements(SERVICES.map((s) => s.id), { min: 2, max: 4 }),
            years: faker.number.int({ min: 1, max: 10 }),
            rating: faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }),
            status: faker.helpers.weightedArrayElement<StaffStatus>([
                { weight: 60, value: "Available" },
                { weight: 15, value: "Busy" },
                { weight: 15, value: "Assigned" },
                { weight: 10, value: "Offline" },
            ]),
            isActive: i < 3 || !faker.datatype.boolean({ probability: 0.12 }), // staff 0 to 4 are always active; about 1 in 8 of the rest are deactivated
        })),
    ];

const activeStaff = staffSeeds.flatMap((s, i) => (s.isActive ? [i] : [])); // indexes the generator may assign

// ---------- booking scenarios ----------

// statuses a booking has passed through, in order
const CHAIN: Record<BStatus, BStatus[]> = {
    Pending: ["Pending"],
    Quoted: ["Pending", "Quoted"],
    Confirmed: ["Pending", "Quoted", "Confirmed"],
    Assigned: ["Pending", "Quoted", "Confirmed", "Assigned"],
    "In Progress": ["Pending", "Quoted", "Confirmed", "Assigned", "In Progress"],
    Completed: ["Pending", "Quoted", "Confirmed", "Assigned", "In Progress", "Completed"],
    Cancelled: ["Pending", "Quoted", "Confirmed", "Cancelled"],
    Rejected: ["Pending", "Rejected"],
};

const HAS_QUOTE: BStatus[] = ["Quoted", "Confirmed", "Assigned", "In Progress", "Completed", "Cancelled"];

const STATUS_WEIGHTS: { weight: number; value: BStatus }[] = [
    { weight: 40, value: "Completed" },
    { weight: 15, value: "Confirmed" },
    { weight: 14, value: "Assigned" },
    { weight: 10, value: "Pending" },
    { weight: 8, value: "Quoted" },
    { weight: 8, value: "Cancelled" },
    { weight: 5, value: "Rejected" },
    // "In Progress" only appears in the hardcoded specs, since it only makes sense for today
];

const ADD_ON_POOL = [
    "Window Cleaning", "Inside Oven", "Inside Fridge", "Balcony Cleaning", "Carpet Shampoo",
    "Pet Hair Removal", "Fabric Protection Spray", "Disinfection Treatment", "Trash Removal", "Wall Spot Cleaning",
];

// Picks a random status first, then builds everything the rules require for it, so the data never contradicts itself:
// Assigned and Completed bookings have enough accepted staff, Confirmed ones have fewer than required,
// only bookings with an accepted quote have a payment, and cash payments never fail.
function randomSpecs(count: number, customerCount: number): Spec[] {
    const methods: Method[] = ["Card", "Cash", "Bank Transfer"];
    const pick = (n: number) => faker.helpers.arrayElements(activeStaff, n);

    return Array.from({ length: count }, (): Spec => {
        const status = faker.helpers.weightedArrayElement(STATUS_WEIGHTS);

        // when: finished work is in the past (inside the dashboard's 90-day window), open work is ahead
        const day =
            status === "Completed" || status === "Cancelled"
                ? -faker.number.int({ min: 1, max: 80 })
                : status === "Rejected"
                    ? faker.number.int({ min: -10, max: 10 })
                    : faker.number.int({ min: 1, max: 14 });

        // staff
        let staff: number[] = [];
        let assignment: Spec["assignment"];
        let staffRequired = 1;
        if (status === "Assigned" || status === "Completed") {
            staffRequired = faker.helpers.weightedArrayElement([
                { weight: 75, value: 1 },
                { weight: 25, value: 2 },
            ]);
            staff = pick(staffRequired + (faker.datatype.boolean({ probability: 0.2 }) ? 1 : 0));
            assignment = "Accepted";
        } else if (status === "Confirmed") {
            const mode = faker.helpers.arrayElement(["none", "waiting", "partial"]);
            if (mode === "waiting") {
                staff = pick(1);
                assignment = "Assigned"; // asked, no answer yet
            } else if (mode === "partial") {
                staff = pick(1);
                assignment = "Accepted";
                staffRequired = 2; // one accepted of two required, so it stays Confirmed
            }
        } else if (status === "Cancelled" && faker.datatype.boolean()) {
            staff = pick(1);
            assignment = "Accepted";
        }

        // payment
        let pay: PStatus | undefined;
        if (status === "Completed") {
            pay = faker.helpers.weightedArrayElement<PStatus>([
                { weight: 85, value: "Paid" },
                { weight: 15, value: "Pending" },
            ]);
        } else if (status === "Cancelled") {
            pay = faker.datatype.boolean({ probability: 0.4 }) ? "Refunded" : undefined;
        } else if (status === "Confirmed" || status === "Assigned") {
            pay = faker.helpers.arrayElement<PStatus | undefined>([undefined, undefined, "Pending", "Failed"]);
        }
        const method: Method | undefined =
            pay === "Failed"
                ? faker.helpers.arrayElement<Method>(["Card", "Bank Transfer"]) // cash can't fail
                : pay === "Refunded"
                    ? "Card"
                    : pay
                        ? faker.helpers.arrayElement(methods)
                        : undefined;

        return {
            day,
            hour: faker.number.int({ min: 8, max: 17 }),
            min: faker.helpers.arrayElement([0, 30]),
            customer: faker.number.int({ min: 0, max: customerCount - 1 }),
            services: faker.helpers.arrayElements(SERVICES.map((s) => s.id), { min: 1, max: 3 }),
            size: faker.number.int({ min: 500, max: 3000, multipleOf: 50 }),
            status,
            staff,
            assignment,
            staffRequired,
            pay,
            method,
            discount: faker.datatype.boolean({ probability: 0.25 })
                ? faker.number.int({ min: 500, max: 2000, multipleOf: 100 })
                : undefined,
            addOns: faker.datatype.boolean({ probability: 0.4 })
                ? faker.helpers.arrayElements(ADD_ON_POOL, { min: 1, max: 4 }).map((description) => ({
                    description,
                    amount: faker.number.int({ min: 1000, max: 5000, multipleOf: 100 }),
                }))
                : undefined,
        };
    });
}

// the ones kept by hand: today's operations (including a job in progress) and the states the random ones might miss
const HARDCODED_SPECS: Spec[] = [
    // today's operations
    { day: 0, hour: 9, customer: 0, services: ["basic"], size: 900, status: "Assigned", staff: [0], assignment: "Accepted" },
    { day: 0, hour: 11, min: 30, customer: 1, services: ["deep"], size: 1500, status: "In Progress", staff: [1], assignment: "Accepted", pay: "Pending", method: "Cash" },
    {
        day: 0, hour: 14, customer: 2, services: ["sofa", "mattress"], size: 1100, status: "Confirmed", staff: [2], assignment: "Assigned",
        addOns: [
            { description: "Pet Hair Removal", amount: 1500 },
            { description: "Fabric Protection Spray", amount: 2500 },
        ],
    },
    // one of each state the random ones might miss
    { day: 2, hour: 10, customer: 0, services: ["renovation"], size: 2000, status: "Pending", staff: [] },
    { day: 3, hour: 13, customer: 1, services: ["move-in"], size: 1400, status: "Quoted", staff: [] },
    { day: 7, hour: 11, customer: 2, services: ["other"], size: 700, status: "Rejected", staff: [] },
    { day: -60, hour: 9, customer: 0, services: ["basic"], size: 850, status: "Cancelled", staff: [0], assignment: "Accepted", pay: "Refunded", method: "Card" },
    { day: 5, hour: 9, customer: 1, services: ["basic", "sofa"], size: 1000, status: "Confirmed", staff: [], pay: "Failed", method: "Card" },
];

const SPECS: Spec[] = [...HARDCODED_SPECS, ...randomSpecs(BOOKING_COUNT - HARDCODED_SPECS.length, CUSTOMER_COUNT)];

// ---------- the seed ----------

async function main() {
    // clear children before parents
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

    // ---- admin ----
    const admin = await db.orm.public.User.create({
        name: "Admin",
        email: "admin@microclean.test",
        passwordHash,
        role: "admin",
    });

    // ---- staff (user + profile) ----
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
            status: s.status,
            isActive: s.isActive,
            userId: user.id,
        });
        staffIds.push(staff.id);
    }

    // ---- customers (hardcoded first, then generated up to CUSTOMER_COUNT) ----
    // add any customers you want by hand to this list, and to the usedNames set near the top
    const hardcodedCustomers = ["Ryo Yamada", "Agnes Tachyon"];
    const customerNames = [
        ...hardcodedCustomers,
        ...Array.from({ length: CUSTOMER_COUNT - hardcodedCustomers.length }, () => uniqueName()),
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

    // ---- bookings and everything derived from them ----
    for (const [i, spec] of SPECS.entries()) {
        const id = `MC-${1001 + i}`;
        const customer = customers[spec.customer];
        const scheduled = dayAt(spec.day, spec.hour, spec.min ?? 0);
        // never later than 3 days ago, so history timestamps are never in the future
        const created = new Date(Math.min(scheduled.getTime() - 6 * DAY, Date.now() - 3 * DAY));

        const timeOf: Record<BStatus, Date> = {
            Pending: created,
            Quoted: new Date(created.getTime() + 12 * HOUR),
            Confirmed: new Date(created.getTime() + 48 * HOUR),
            Assigned: new Date(created.getTime() + 51 * HOUR),
            "In Progress": scheduled,
            Completed: new Date(scheduled.getTime() + 3 * HOUR),
            Cancelled: new Date(created.getTime() + 72 * HOUR),
            Rejected: new Date(created.getTime() + 12 * HOUR),
        };
        const staffName = spec.staff.length ? staffSeeds[spec.staff[0]].name : "Admin";
        const changedBy: Record<BStatus, string> = {
            Pending: "System",
            Quoted: "Admin",
            Confirmed: "Customer",
            Assigned: "System",
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
            staffRequired: spec.staffRequired ?? 1,
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

        // ---- quotation ----
        let total = 0;
        if (HAS_QUOTE.includes(spec.status)) {
            const lines = spec.services.map((serviceId) => ({ serviceId, price: priceOf(serviceId) }));
            const addOns = [
                { description: `${spec.size} sq ft`, amount: spec.size * 5 }, // size line, always present
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

        // ---- payment ----
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

        // ---- admin notifications (one row per recipient) ----
        const events: { type: NType; at: Date; message: string }[] = [
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
                type: e.type,
                bookingId: id,
                message: e.message,
                isRead: e.at.getTime() < Date.now() - 2 * DAY,
                createdAt: e.at,
            }))
        );
    }

    console.log("Data Seeded");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .then(() => process.exit(0)); // the DB client may keep the process alive otherwise