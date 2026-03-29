import { User, Calendar, Settings } from "lucide-react";
import { NavigationTabs } from "@/components/NavigationTabs";

export function ProfileTabs() {
  const tabs = [
    { value: "resumen", label: "Resumen", icon: User },
    { value: "clases", label: "Clases", icon: Calendar },
    { value: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return <NavigationTabs tabs={tabs} />;
}
