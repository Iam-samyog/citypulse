"use client";

import type { InfrastructureCategory, InfrastructureComponent } from "@/types/infrastructure";
import { InfrastructureNode } from "./InfrastructureNode";

interface InfrastructureLayerProps {
  category: InfrastructureCategory;
  components: InfrastructureComponent[];
  visible: boolean;
  selectedComponentId?: string | null;
  onSelectComponent?: (componentId: string) => void;
}

/**
 * Groups all components of one category (electricity, water, etc.) so the
 * UI can toggle entire infrastructure layers on/off — see section 5.1 of
 * the project spec ("Different infrastructure layers can be enabled or
 * disabled to make complex networks easier to understand").
 */
export function InfrastructureLayer({
  category,
  components,
  visible,
  selectedComponentId,
  onSelectComponent,
}: InfrastructureLayerProps) {
  if (!visible) return null;

  const categoryComponents = components.filter((c) => c.category === category);

  return (
    <group name={`layer-${category}`}>
      {categoryComponents.map((component) => (
        <InfrastructureNode
          key={component.componentId}
          component={component}
          selected={component.componentId === selectedComponentId}
          onSelect={onSelectComponent}
        />
      ))}
    </group>
  );
}
