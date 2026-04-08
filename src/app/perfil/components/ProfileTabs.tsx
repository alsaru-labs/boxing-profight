import { User, Settings } from "lucide-react";
import { NavigationTabs } from "@/components/NavigationTabs";

export function ProfileTabs() {
  const tabs = [
    { value: "resumen", label: "Resumen", icon: User },
    { value: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return <NavigationTabs tabs={tabs} />;
}
