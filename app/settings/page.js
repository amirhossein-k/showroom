import { getSettings } from '@/lib/settings';
import SettingsClient from '@/components/SettingsClient';
export const dynamic = 'force-dynamic';
export default async function SettingsPage() { return <SettingsClient initial={await getSettings()} />; }
