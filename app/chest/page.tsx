import type { Metadata } from "next";
import ChestView from "./ChestView";

export const metadata: Metadata = {
  title: "FarFISH — Chest",
  description: "FarFISH chest — rewards, claims and activity.",
};

export default function ChestPage() {
  return <ChestView />;
}
