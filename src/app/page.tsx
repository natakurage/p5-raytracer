import Image from "next/image";
import styles from "./page.module.css";
import RayTracingCanvas from "../../components/RayTracingCanvas";

export default function Home() {
  return (
    <main>
      <RayTracingCanvas />
    </main>
  );
}
