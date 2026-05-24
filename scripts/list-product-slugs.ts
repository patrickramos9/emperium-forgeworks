import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { listAllProducts } from "../src/lib/listAllProducts";

Amplify.configure(outputs);

async function main() {
  const { generateClient } = await import("aws-amplify/data");
  const guest = generateClient();
  console.log("Guest list...");
  try {
    const guestRows = await listAllProducts(guest);
    console.log("Guest count:", guestRows.length);
    console.log("Guest slugs:", guestRows.map((r) => r.slug).sort().join(", "));
  } catch (e) {
    console.error("Guest failed:", e);
  }

  const { signIn } = await import("aws-amplify/auth");
  const { generateClient: gen } = await import("aws-amplify/data");
  console.log("Admin sign-in...");
  await signIn({
    username: "admin@emperiumforgeworks.com",
    password: process.env.ADMIN_PASSWORD ?? "EmperiumForge2026!",
  });
  const admin = gen({ authMode: "userPool" });
  const adminRows = await listAllProducts(admin);
  console.log("Admin count:", adminRows.length);
  console.log("Admin slugs:", adminRows.map((r) => r.slug).sort().join(", "));
  const test = adminRows.find((r) => r.slug === "test");
  console.log("test product:", test ? test.title : "NOT FOUND");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
