/**
 * Registro centralizado de iconos Lucide usados en la aplicación.
 * Se provee globalmente en `app.config.ts` vía LUCIDE_ICONS.
 *
 * Para agregar un icono nuevo:
 *   1. Importarlo de 'lucide-angular' (PascalCase).
 *   2. Incluirlo en el objeto exportado.
 *   3. Usarlo en templates vía <lucide-icon name="kebab-case" ...></lucide-icon>.
 */
import {
  // Navegación y layout
  LayoutDashboard, ClipboardList, Database, ListTodo, Users, History, Menu,
  ChevronsLeft, ChevronsRight, X, LogIn, LogOut, House, Table, List,

  // Acciones comunes
  Search, Plus, Pencil, Trash2, Eye, EyeOff, Download, Upload, FileUp, FileDown,
  Save, Copy, RefreshCw, ExternalLink, ListFilter, SlidersHorizontal,
  ArrowLeft, ArrowRight, ArrowUpFromLine, ArrowDownToLine, Import, Ban,

  // Chevrons
  ChevronRight, ChevronDown, ChevronLeft, ChevronUp,

  // Estados
  Check, CircleCheck, CircleAlert, TriangleAlert, Info, CircleX,
  Clock, Loader, Circle, CheckCheck,

  // Dominio
  Calendar, CalendarDays, CalendarPlus, Bell, BellOff, MapPin, MapPinned,
  TrendingUp, Clipboard, ClipboardCheck, Shield, ShieldCheck, Lock,
  User, UserPlus, UserCheck, UserCog, CircleUser,
  Mail, Phone, Globe, Building, AtSign,
  FileText, FileSpreadsheet, FileSearch, FolderOpen, Folder, ScrollText,
  ChartColumn, ChartPie, ChartLine, ChartBar, ChartArea,
  Paperclip, Link as LinkIcon, Tag, Hash, Gauge, Sparkles,

  // Otros
  Settings, Cog, Pin, GripVertical, Grid2x2,
  Maximize2, Minimize2, Activity,
  MoreHorizontal, MoreVertical,
  Target, Award, Briefcase, Layers,
  Inbox, Send,
  Heart, Smile,
  Package, Dog, Cat, Trees,
  ShieldAlert, Megaphone, Image, Video,
} from 'lucide-angular';

export const LUCIDE_ICON_SET = {
  LayoutDashboard, ClipboardList, Database, ListTodo, List, Users, History, Menu,
  ChevronsLeft, ChevronsRight, X, LogIn, LogOut, House, Table,
  Search, Plus, Pencil, Trash2, Eye, EyeOff, Download, Upload, FileUp, FileDown,
  Save, Copy, RefreshCw, ExternalLink, ListFilter, SlidersHorizontal,
  ArrowLeft, ArrowRight, ArrowUpFromLine, ArrowDownToLine, Import, Ban,
  ChevronRight, ChevronDown, ChevronLeft, ChevronUp,
  Check, CircleCheck, CircleAlert, TriangleAlert, Info, CircleX,
  Clock, Loader, Circle, CheckCheck,
  Calendar, CalendarDays, CalendarPlus, Bell, BellOff, MapPin, MapPinned,
  TrendingUp, Clipboard, ClipboardCheck, Shield, ShieldCheck, Lock,
  User, UserPlus, UserCheck, UserCog, CircleUser,
  Mail, Phone, Globe, Building, AtSign,
  FileText, FileSpreadsheet, FileSearch, FolderOpen, Folder, ScrollText,
  ChartColumn, ChartPie, ChartLine, ChartBar, ChartArea,
  Paperclip, Link: LinkIcon, Tag, Hash, Gauge, Sparkles,
  Settings, Cog, Pin, GripVertical, Grid2x2,
  Maximize2, Minimize2, Activity,
  MoreHorizontal, MoreVertical,
  Target, Award, Briefcase, Layers,
  Inbox, Send,
  Heart, Smile,
  Package, Dog, Cat, Trees,
  ShieldAlert, Megaphone, Image, Video,
};
