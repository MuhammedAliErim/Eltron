import { TagRepository, TagRow, TagCreate } from '../../database/repositories/TagRepository';
import { ValidationError, BusinessRuleError } from '../../utils/errors';

const TAG_NAME_REGEX = /^[a-z0-9_-]+$/;
const MAX_TAG_NAME_LENGTH = 50;
const MAX_TAG_CONTENT_LENGTH = 2000;
const TAGS_PER_PAGE = 15;

const tagRepository = new TagRepository();

function validateTagName(name: string): string {
  const normalized = name.toLowerCase().trim();

  if (normalized.length === 0) {
    throw new ValidationError('Tag name cannot be empty');
  }

  if (normalized.length > MAX_TAG_NAME_LENGTH) {
    throw new ValidationError(`Tag name must be ${MAX_TAG_NAME_LENGTH} characters or less`);
  }

  if (!TAG_NAME_REGEX.test(normalized)) {
    throw new ValidationError('Tag name can only contain lowercase letters, numbers, hyphens, and underscores');
  }

  return normalized;
}

function validateTagContent(content: string): string {
  if (!content || content.trim().length === 0) {
    throw new ValidationError('Tag content cannot be empty');
  }

  if (content.length > MAX_TAG_CONTENT_LENGTH) {
    throw new ValidationError(`Tag content must be ${MAX_TAG_CONTENT_LENGTH} characters or less`);
  }

  return content;
}

export async function createTag(
  guildId: string,
  name: string,
  content: string,
  aliases: string[],
  createdBy: string
): Promise<TagRow> {
  const normalizedName = validateTagName(name);
  const validatedContent = validateTagContent(content);

  const existing = await tagRepository.getByName(guildId, normalizedName);
  if (existing) {
    throw new BusinessRuleError(`A tag with the name \`${normalizedName}\` already exists`);
  }

  for (const alias of aliases) {
    const normalizedAlias = validateTagName(alias);
    const aliasTag = await tagRepository.getByName(guildId, normalizedAlias);
    if (aliasTag) {
      throw new BusinessRuleError(`The alias \`${normalizedAlias}\` is already in use by another tag`);
    }
  }

  const normalizedAliases = aliases.map(a => validateTagName(a));

  return tagRepository.create({
    guild_id: guildId,
    name: normalizedName,
    content: validatedContent,
    aliases: normalizedAliases,
    created_by: createdBy,
  });
}

export async function getTag(guildId: string, nameOrAlias: string): Promise<TagRow | null> {
  const normalizedName = nameOrAlias.toLowerCase().trim();

  let tag = await tagRepository.getByName(guildId, normalizedName);
  if (tag) return tag;

  const allTags = await tagRepository.getByGuild(guildId);
  tag = allTags.find(t => t.aliases.includes(normalizedName)) || null;

  return tag;
}

export async function deleteTag(guildId: string, name: string): Promise<boolean> {
  const normalizedName = name.toLowerCase().trim();
  const tag = await tagRepository.getByName(guildId, normalizedName);

  if (!tag) {
    throw new BusinessRuleError(`Tag \`${normalizedName}\` not found`);
  }

  return tagRepository.delete(tag.id);
}

export async function listTags(guildId: string, page: number): Promise<{ tags: TagRow[]; total: number; page: number; totalPages: number }> {
  const p = Math.max(1, page);
  const { tags, total } = await tagRepository.getByGuildPaginated(guildId, p, TAGS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(total / TAGS_PER_PAGE));

  return { tags, total, page: p, totalPages };
}

export async function searchTags(guildId: string, query: string): Promise<TagRow[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }
  return tagRepository.search(guildId, query.trim());
}

export async function useTag(guildId: string, nameOrAlias: string): Promise<TagRow> {
  const tag = await getTag(guildId, nameOrAlias);

  if (!tag) {
    throw new BusinessRuleError(`Tag \`${nameOrAlias}\` not found`);
  }

  await tagRepository.incrementUses(tag.id);

  return tag;
}

export async function updateTagContent(
  guildId: string,
  name: string,
  content: string
): Promise<TagRow> {
  const normalizedName = name.toLowerCase().trim();
  const tag = await tagRepository.getByName(guildId, normalizedName);

  if (!tag) {
    throw new BusinessRuleError(`Tag \`${normalizedName}\` not found`);
  }

  const validatedContent = validateTagContent(content);
  const updated = await tagRepository.update(tag.id, { content: validatedContent });

  if (!updated) {
    throw new BusinessRuleError('Failed to update tag');
  }

  return updated;
}

export async function addTagAlias(
  guildId: string,
  name: string,
  alias: string
): Promise<TagRow> {
  const normalizedName = name.toLowerCase().trim();
  const normalizedAlias = validateTagName(alias);

  const tag = await tagRepository.getByName(guildId, normalizedName);
  if (!tag) {
    throw new BusinessRuleError(`Tag \`${normalizedName}\` not found`);
  }

  if (tag.name === normalizedAlias || tag.aliases.includes(normalizedAlias)) {
    throw new BusinessRuleError(`\`${normalizedAlias}\` is already associated with this tag`);
  }

  const aliasTag = await tagRepository.getByName(guildId, normalizedAlias);
  if (aliasTag) {
    throw new BusinessRuleError(`\`${normalizedAlias}\` is already in use as a tag name`);
  }

  const allTags = await tagRepository.getByGuild(guildId);
  const aliasConflict = allTags.find(t => t.id !== tag.id && t.aliases.includes(normalizedAlias));
  if (aliasConflict) {
    throw new BusinessRuleError(`\`${normalizedAlias}\` is already used as an alias for another tag`);
  }

  const updatedAliases = [...tag.aliases, normalizedAlias];
  const updated = await tagRepository.update(tag.id, { aliases: updatedAliases });

  if (!updated) {
    throw new BusinessRuleError('Failed to add alias');
  }

  return updated;
}
