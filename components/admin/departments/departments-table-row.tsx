import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react';

import { DepartmentDto } from '@/types';

import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, TableCell, TableRow } from '@/components/ui';

import type { HeadDoctorNameMap } from './departments.types';

type DepartmentsTableRowProps = {
  department: DepartmentDto;
  headNames: HeadDoctorNameMap;
  onEdit: (department: DepartmentDto) => void;
  onActivation: (department: DepartmentDto) => void;
  onDelete: (department: DepartmentDto) => void;
};

export function DepartmentsTableRow({ department, headNames, onEdit, onActivation, onDelete }: DepartmentsTableRowProps) {
  /*
    A head who has since been deactivated is not in the assignable set, so their name is not in
    the map and the row shows "—". The id is still stored — this is a display gap, not a lost link.
  */
  const headName = department.headDoctorId ? (headNames[department.headDoctorId] ?? '—') : '—';

  const handleEditClick = (): void => {
    onEdit(department);
  };

  const handleActivationClick = (): void => {
    onActivation(department);
  };

  const handleDeleteClick = (): void => {
    onDelete(department);
  };

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium">{department.name}</span>
      </TableCell>

      <TableCell>
        <Badge variant="neutral" className="font-mono">
          {department.code}
        </Badge>
      </TableCell>

      <TableCell className="text-muted-foreground">{headName}</TableCell>

      <TableCell>
        <Badge variant={department.isActive ? 'success' : 'neutral'}>{department.isActive ? 'Active' : 'Deactivated'}</Badge>
      </TableCell>

      <TableCell className="text-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Actions" />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleActivationClick}>
              <Power />
              {department.isActive ? 'Deactivate' : 'Reactivate'}
            </DropdownMenuItem>

            <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
