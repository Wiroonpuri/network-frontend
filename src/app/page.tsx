import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has("user");

  if (isLoggedIn) {
    redirect("/chat");
  } else {
    redirect("/login");
  }
}
