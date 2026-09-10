import { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { useLevelConfig } from '../hooks/useLevelConfig';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorDisplay, LoadingDisplay } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';

export function LevelingConfigPage() {
  const { activeGuild } = useGuild();
  const guildId = activeGuild?.id ?? null;
  const { config, rewards, loading, error, fetchConfig, updateConfig, fetchRewards, addReward, removeReward, refetch } = useLevelConfig(guildId);
  const { addToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [xpPerMessage, setXpPerMessage] = useState(15);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [levelUpMessage, setLevelUpMessage] = useState('Congratulations {user}! You reached level **{level}**!');
  const [levelUpChannel, setLevelUpChannel] = useState('');
  const [levelUpEmbed, setLevelUpEmbed] = useState(true);
  const [xpMultiplier, setXpMultiplier] = useState(1.0);

  const [newRewardLevel, setNewRewardLevel] = useState('');
  const [newRewardRoleId, setNewRewardRoleId] = useState('');
  const [addingReward, setAddingReward] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetchConfig();
      fetchRewards();
    }
  }, [guildId, fetchConfig, fetchRewards]);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setXpPerMessage(config.xpPerMessage);
      setCooldownSeconds(config.cooldownSeconds);
      setLevelUpMessage(config.levelUpMessage);
      setLevelUpChannel(config.levelUpChannel || '');
      setLevelUpEmbed(config.levelUpEmbed);
      setXpMultiplier(config.xpMultiplier);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateConfig({
        enabled,
        xpPerMessage,
        cooldownSeconds,
        levelUpMessage,
        levelUpChannel: levelUpChannel || null,
        levelUpEmbed,
        xpMultiplier,
      });
      addToast({ type: 'success', message: 'Leveling configuration saved.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddReward = async () => {
    const level = parseInt(newRewardLevel, 10);
    if (isNaN(level) || level < 1) {
      addToast({ type: 'error', message: 'Invalid level number.' });
      return;
    }
    if (!newRewardRoleId.trim()) {
      addToast({ type: 'error', message: 'Role ID is required.' });
      return;
    }
    try {
      setAddingReward(true);
      await addReward(level, newRewardRoleId.trim());
      setNewRewardLevel('');
      setNewRewardRoleId('');
      addToast({ type: 'success', message: `Role reward added for level ${level}.` });
    } catch {
      addToast({ type: 'error', message: 'Failed to add role reward.' });
    } finally {
      setAddingReward(false);
    }
  };

  const handleRemoveReward = async (level: number) => {
    try {
      await removeReward(level);
      addToast({ type: 'success', message: `Role reward for level ${level} removed.` });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove role reward.' });
    }
  };

  const previewMessage = levelUpMessage
    .replace('{user}', '@User')
    .replace('{level}', '5')
    .replace('{oldLevel}', '4')
    .replace('{username}', 'Username')
    .replace('{server}', activeGuild?.name || 'Server');

  if (!guildId) return <EmptyState title="No server selected" description="Select a server from the sidebar." icon="Levels" />;
  if (loading && !config) return <LoadingDisplay />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Leveling Configuration" description="Configure XP, level-up messages, and role rewards" icon="Levels" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 rounded border-eltron-border text-eltron-accent focus:ring-eltron-accent" />
                <span className="text-sm text-eltron-text">Enable leveling system</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-eltron-text mb-1">XP Per Message</label>
                <input type="number" min={1} max={100} value={xpPerMessage} onChange={(e) => setXpPerMessage(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-eltron-text text-sm focus:outline-none focus:ring-2 focus:ring-eltron-accent" />
              </div>

              <div>
                <label className="block text-sm font-medium text-eltron-text mb-1">Cooldown (seconds)</label>
                <input type="number" min={0} max={3600} value={cooldownSeconds} onChange={(e) => setCooldownSeconds(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-eltron-text text-sm focus:outline-none focus:ring-2 focus:ring-eltron-accent" />
              </div>

              <div>
                <label className="block text-sm font-medium text-eltron-text mb-1">XP Multiplier</label>
                <input type="number" min={0.5} max={5} step={0.1} value={xpMultiplier} onChange={(e) => setXpMultiplier(parseFloat(e.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-eltron-text text-sm focus:outline-none focus:ring-2 focus:ring-eltron-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Level-Up Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={levelUpEmbed} onChange={(e) => setLevelUpEmbed(e.target.checked)} className="w-4 h-4 rounded border-eltron-border text-eltron-accent focus:ring-eltron-accent" />
                <span className="text-sm text-eltron-text">Use embed for level-up</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-eltron-text mb-1">Channel ID (leave empty for current channel)</label>
                <input type="text" value={levelUpChannel} onChange={(e) => setLevelUpChannel(e.target.value)} placeholder="Optional channel ID" className="w-full px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-eltron-text text-sm focus:outline-none focus:ring-2 focus:ring-eltron-accent" />
              </div>

              <div>
                <label className="block text-sm font-medium text-eltron-text mb-1">Message Template</label>
                <textarea value={levelUpMessage} onChange={(e) => setLevelUpMessage(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-eltron-text text-sm focus:outline-none focus:ring-2 focus:ring-eltron-accent resize-none" />
              </div>

              <div className="p-3 rounded-lg bg-eltron-surface text-2xs text-eltron-subtle">
                <p className="font-medium mb-1">Available variables:</p>
                <p>{'{user}'} {'{username}'} {'{level}'} {'{oldLevel}'} {'{server}'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rewards.length > 0 && (
                <div className="space-y-2">
                  {rewards.map((reward) => (
                    <div key={reward.level} className="flex items-center justify-between p-2 rounded-lg bg-eltron-elevated">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">Lv.{reward.level}</Badge>
                        <span className="text-sm text-eltron-text font-mono">{reward.role_id}</span>
                      </div>
                      <button onClick={() => handleRemoveReward(reward.level)} className="text-eltron-danger hover:text-eltron-danger/80 text-xs">
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input type="number" min={1} placeholder="Level" value={newRewardLevel} onChange={(e) => setNewRewardLevel(e.target.value)} className="w-20 px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-eltron-text text-sm focus:outline-none focus:ring-2 focus:ring-eltron-accent" />
                <input type="text" placeholder="Role ID" value={newRewardRoleId} onChange={(e) => setNewRewardRoleId(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-eltron-elevated border border-eltron-border text-eltron-text text-sm focus:outline-none focus:ring-2 focus:ring-eltron-accent" />
                <Button variant="secondary" onClick={handleAddReward} disabled={addingReward}>
                  {addingReward ? '...' : 'Add'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-eltron-elevated border border-eltron-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-eltron-accent flex items-center justify-center flex-shrink-0">
                  <Icon name="Bot" size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-eltron-text">Eltron</p>
                  <p className="text-xs text-eltron-muted mt-0.5">
                    {enabled ? previewMessage : 'Leveling system is disabled.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-eltron-surface text-2xs text-eltron-subtle">
              <p className="font-medium mb-1">Current Settings</p>
              <div className="space-y-1">
                <p>XP per message: <span className="text-eltron-text">{xpPerMessage}</span></p>
                <p>Cooldown: <span className="text-eltron-text">{cooldownSeconds}s</span></p>
                <p>Multiplier: <span className="text-eltron-text">{xpMultiplier}x</span></p>
                <p>Embed: <span className="text-eltron-text">{levelUpEmbed ? 'Yes' : 'No'}</span></p>
                <p>Role rewards: <span className="text-eltron-text">{rewards.length}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
