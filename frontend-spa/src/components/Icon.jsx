// Shared application icon adapter. Every named application icon is an
// official Solar component; outline is used by default, while `filled` opts
// into Solar's flat/bold treatment for stronger emphasis.
import { BellIcon } from '@solar-icons/react/linear/bell';
import { KeyIcon } from '@solar-icons/react/linear/key';
import { LetterIcon } from '@solar-icons/react/linear/letter';
import { CalendarIcon } from '@solar-icons/react/linear/calendar';
import { CarIcon } from '@solar-icons/react/linear/car';
import { ClipboardIcon } from '@solar-icons/react/linear/clipboard';
import { MagnifierIcon } from '@solar-icons/react/linear/magnifier';
import { EyeIcon } from '@solar-icons/react/linear/eye';
import { EyeClosedIcon } from '@solar-icons/react/linear/eye-closed';
import { ToolboxIcon } from '@solar-icons/react/linear/toolbox';
import { CheckCircleIcon } from '@solar-icons/react/linear/check-circle';
import { FlagIcon } from '@solar-icons/react/linear/flag';
import { DangerTriangleIcon } from '@solar-icons/react/linear/danger-triangle';
import { LinkIcon } from '@solar-icons/react/linear/link';
import { InfoCircleIcon } from '@solar-icons/react/linear/info-circle';
import { CloseCircleIcon } from '@solar-icons/react/linear/close-circle';
import { ArrowLeftIcon } from '@solar-icons/react/linear/arrow-left';
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down';
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right';
import { AddIcon } from '@solar-icons/react/linear/add';
import { HamburgerMenuIcon } from '@solar-icons/react/linear/hamburger-menu';
import { WidgetIcon } from '@solar-icons/react/linear/widget';
import { ListIcon } from '@solar-icons/react/linear/list';
import { TableColumnsSplitIcon } from '@solar-icons/react/linear/table-columns-split';
import { GripVerticalIcon } from '@solar-icons/react/linear/grip-vertical';
import { PenIcon } from '@solar-icons/react/linear/pen';
import { TrashBinTrashIcon } from '@solar-icons/react/linear/trash-bin-trash';
import { ArchiveIcon } from '@solar-icons/react/linear/archive';
import { DownloadIcon } from '@solar-icons/react/linear/download';
import { UndoLeftIcon } from '@solar-icons/react/linear/undo-left';
import { TicketIcon } from '@solar-icons/react/linear/ticket';
import { MapPointIcon } from '@solar-icons/react/linear/map-point';
import { SunIcon } from '@solar-icons/react/linear/sun';
import { CloudSunIcon } from '@solar-icons/react/linear/cloud-sun';
import { CloudIcon } from '@solar-icons/react/linear/cloud';
import { CloudBoltIcon } from '@solar-icons/react/linear/cloud-bolt';
import { SettingsIcon } from '@solar-icons/react/linear/settings';
import { SettingsIcon as SettingsFlatIcon } from '@solar-icons/react/bold/settings';

const ICONS = {
  bell: BellIcon, key: KeyIcon, mail: LetterIcon, calendar: CalendarIcon,
  vehicle: CarIcon, boat: CarIcon, clipboard: ClipboardIcon, search: MagnifierIcon,
  eye: EyeIcon, eyeOff: EyeClosedIcon, wrench: ToolboxIcon, tools: SettingsIcon,
  checkCircle: CheckCircleIcon, flag: FlagIcon, alert: DangerTriangleIcon,
  link: LinkIcon, info: InfoCircleIcon, close: CloseCircleIcon,
  // Solar intentionally does not ship brand logos, so social links use its
  // neutral link glyph rather than mixing another visual icon family in.
  facebook: LinkIcon, instagram: LinkIcon, twitterX: LinkIcon, linkedin: LinkIcon,
  arrowLeft: ArrowLeftIcon, chevronDown: AltArrowDownIcon, chevronRight: AltArrowRightIcon,
  plus: AddIcon, menu: HamburgerMenuIcon, grid: WidgetIcon, list: ListIcon,
  columns: TableColumnsSplitIcon, gripVertical: GripVerticalIcon, edit: PenIcon,
  trash: TrashBinTrashIcon, archive: ArchiveIcon, download: DownloadIcon,
  undo: UndoLeftIcon, ticket: TicketIcon, pin: MapPointIcon, sun: SunIcon,
  cloudSun: CloudSunIcon, cloudFog: CloudIcon, cloudRain: CloudIcon,
  cloudLightning: CloudBoltIcon, gear: SettingsIcon,
};

export default function Icon({ name, size = 16, strokeWidth, className, style, filled = false }) {
  const SolarIcon = ICONS[name];
  if (!SolarIcon) return null;
  const Component = filled && name === 'gear' ? SettingsFlatIcon : SolarIcon;
  return <Component className={className} style={style} size={size} color="currentColor" strokeWidth={strokeWidth} aria-hidden="true" />;
}

export function weatherIconName(code) {
  if (code === 0) return 'sun';
  if ([1, 2, 3].includes(code)) return 'cloudSun';
  if ([45, 48].includes(code)) return 'cloudFog';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'cloudRain';
  if ([95, 96, 99].includes(code)) return 'cloudLightning';
  return 'cloudSun';
}
