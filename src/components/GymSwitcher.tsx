import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GymSwitcherProps {
  collapsed?: boolean;
}

export function GymSwitcher({ collapsed = false }: GymSwitcherProps) {
  const { gym, gymId, availableGyms, setGymId } = useGym();
  const { isSuperAdmin } = useRole();
  const [open, setOpen] = useState(false);

  // Only show selector if super_admin OR user has 2+ gyms
  if (!isSuperAdmin && availableGyms.length < 2) return null;
  if (availableGyms.length === 0) return null;

  return (
    <div className="px-2 mb-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-xs h-9",
              collapsed && "px-2"
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && (
                <span className="truncate">{gym?.name ?? "Seleccionar gym"}</span>
              )}
            </div>
            {!collapsed && <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar gimnasio..." className="h-9" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {availableGyms.map((g) => (
                  <CommandItem
                    key={g.id}
                    value={g.name}
                    onSelect={() => {
                      setGymId(g.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        gymId === g.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{g.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
