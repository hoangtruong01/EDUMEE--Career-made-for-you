import CareerCompare from "@/views/CareerCompare";
import { Suspense } from "react";

export default function CareerComparePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CareerCompare />
    </Suspense>
  );
}
