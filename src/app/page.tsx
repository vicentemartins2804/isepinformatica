import { getMockups } from "@/lib/mockups";
import VoteForm from "./vote-form";

export default async function Home() {
  return <VoteForm mockups={await getMockups()} />;
}
