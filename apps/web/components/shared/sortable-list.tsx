import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableRenderProps {
  attributes: DraggableAttributes;
  listeners: ReturnType<typeof useSortable>["listeners"];
  isDragging: boolean;
}

interface SortableItemProps {
  id: string;
  children: (props: SortableRenderProps) => ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

export interface SortableListProps {
  ids: string[];
  direction?: "vertical" | "horizontal";
  onReorder: (ids: string[]) => void;
  renderItem: (id: string, handle: SortableRenderProps) => ReactNode;
  className?: string;
}

export function SortableList({
  ids,
  direction = "vertical",
  onReorder,
  renderItem,
  className,
}: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={ids}
        strategy={direction === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        <div className={className}>
          {ids.map((id) => (
            <SortableItem key={id} id={id}>
              {(handle) => renderItem(id, handle)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
