import { MoreHorizontal, Pencil, Power, ShieldCheck, Trash2 } from 'lucide-react';

import { UserDto } from '@/types';

import { USER_ROLES } from '@/constants/roles.const';

import {
  formatShortDate,
  resolveInitials,
  resolveRoleLabel,
  resolveUserStatus,
  resolveUserStatusBadgeVariant,
  resolveUserStatusLabel,
} from '@/lib/utils';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TableCell,
  TableRow,
} from '@/components/ui';

import type { UsersViewer } from './users.types';

type UsersTableRowProps = {
  user: UserDto;
  viewer: UsersViewer;
  onEdit: (user: UserDto) => void;
  onApproval: (user: UserDto) => void;
  onActivation: (user: UserDto) => void;
  onDelete: (user: UserDto) => void;
};

export function UsersTableRow({ user, viewer, onEdit, onApproval, onActivation, onDelete }: UsersTableRowProps) {
  const status = resolveUserStatus(user);
  const isSelf = user.userId === viewer.userId;

  /*
    What this row is allowed to offer, mirroring the rules `UserService` enforces. The service
    refuses these regardless of what the browser sends — rendering a button that could only
    ever produce a refusal is the thing being avoided here, not a hole being closed.
  */
  const isImmutable = user.role === USER_ROLES.SUPER_ADMIN;
  const isForeignAdmin = user.role === USER_ROLES.ADMIN && !viewer.isSuperAdmin;

  const canEdit = !isImmutable && !isForeignAdmin;
  // Approval and activation decide whether an account can sign in, so never your own.
  const canChangeAccess = canEdit && !isSelf;
  const canDelete = canChangeAccess;

  const handleEditClick = (): void => {
    onEdit(user);
  };

  const handleApprovalClick = (): void => {
    onApproval(user);
  };

  const handleActivationClick = (): void => {
    onActivation(user);
  };

  const handleDeleteClick = (): void => {
    onDelete(user);
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-2.5">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs">{resolveInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block font-medium">{user.name}</span>
            {user.phone && <span className="text-muted-foreground block text-xs">{user.phone}</span>}
          </span>
        </div>
      </TableCell>

      <TableCell className="text-muted-foreground break-all">{user.email}</TableCell>

      <TableCell>{resolveRoleLabel(user.role)}</TableCell>

      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatShortDate(user.createdAt)}</TableCell>

      <TableCell>
        <Badge variant={resolveUserStatusBadgeVariant(status)}>{resolveUserStatusLabel(status)}</Badge>
      </TableCell>

      <TableCell className="text-end">
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Actions" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleEditClick}>
                <Pencil />
                Edit
              </DropdownMenuItem>

              {canChangeAccess && (
                <DropdownMenuItem onClick={handleApprovalClick}>
                  <ShieldCheck />
                  {user.isApproved ? 'Revoke approval' : 'Approve'}
                </DropdownMenuItem>
              )}

              {canChangeAccess && (
                <DropdownMenuItem onClick={handleActivationClick}>
                  <Power />
                  {user.isActive ? 'Deactivate' : 'Reactivate'}
                </DropdownMenuItem>
              )}

              {canDelete && (
                <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
