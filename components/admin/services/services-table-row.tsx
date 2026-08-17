import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react';

import { ServiceItemDto } from '@/types';

import { APP_DATA } from '@/constants/app-data.const';
import { SERVICE_CATEGORY_LABELS } from '@/constants/service.const';

import { formatMoney } from '@/lib/utils';

import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, TableCell, TableRow } from '@/components/ui';

type ServicesTableRowProps = {
  service: ServiceItemDto;
  onEdit: (service: ServiceItemDto) => void;
  onActivation: (service: ServiceItemDto) => void;
  onDelete: (service: ServiceItemDto) => void;
};

/*
  Every admin-area user may manage every service — the catalogue has no per-viewer rules the
  way accounts do — so every row carries the same three actions unconditionally.
*/
export function ServicesTableRow({ service, onEdit, onActivation, onDelete }: ServicesTableRowProps) {
  const handleEditClick = (): void => {
    onEdit(service);
  };

  const handleActivationClick = (): void => {
    onActivation(service);
  };

  const handleDeleteClick = (): void => {
    onDelete(service);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{service.name}</TableCell>

      <TableCell>
        <Badge variant="neutral" className="font-mono">
          {service.code}
        </Badge>
      </TableCell>

      <TableCell className="text-muted-foreground">{SERVICE_CATEGORY_LABELS[service.category]}</TableCell>

      <TableCell className="text-end font-medium whitespace-nowrap tabular-nums">
        {APP_DATA.CURRENCY.SYMBOL}
        {formatMoney(service.priceMinorUnits)}
      </TableCell>

      <TableCell>{service.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Retired</Badge>}</TableCell>

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
              {service.isActive ? 'Deactivate' : 'Reactivate'}
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
