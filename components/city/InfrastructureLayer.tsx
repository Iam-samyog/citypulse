"use client";

import type { ComponentCategory, InfrastructureComponent } from "@/types/infrastructure";
import { InfrastructureNode } from "./InfrastructureNode";

interface InfrastructureLayerProps {
  category: ComponentCategory;
  components: InfrastructureComponent[];
  visible: boolean;
  selectedComponentId?: string | null;
  onSelectComponent?: (componentId: string) => void;
}

/** All components of one category, so a whole infrastructure layer can be toggled. */
export function InfrastructureLayer({
  category,
  components,
  visible,
  selectedComponentId,
  onSelectComponent,
}: InfrastructureLayerProps) {
  if (!visible) return null;

  return (
    <group name={`layer-${category}`}>
      {components
        .filter((component) => component.category === category)
        .map((component) => (
          <InfrastructureNode
            key={component.id}
            component={component}
            selected={component.id === selectedComponentId}
            onSelect={onSelectComponent}
          />
        ))}
    </group>
  );
}
