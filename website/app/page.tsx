import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { DeveloperStage } from "@/components/developer-stage";
import { Navigation } from "@/components/navigation";

export default function Home() {
  return <main><Navigation /><Hero /><DeveloperStage /><Footer /></main>;
}
