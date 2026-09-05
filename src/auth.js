const { staffRoleId, xpAdminRoleId } = require('./config');

const ADMIN_COMMANDS = new Set([
  'say',
  'ticket-setup',
  'verify-setup',
  'role-info',
  'autorole-set',
  'reaction-role',
  'members-with-role',
  'lockdown',
  'unlock',
  'slowmode',
  'nick',
  'role-add',
  'role-remove',
  'warn',
  'warnings',
  'clearwarns',
  'invites'
]);

const STAFF_COMMANDS = new Set(['ban', 'kick', 'timeout', 'untimeout', 'urban', 'warn', 'warnings', 'clearwarns', 'purge']);

function isStaff(member) {
  return Boolean(staffRoleId && member?.roles?.cache?.has(staffRoleId));
}

function isServerAdmin(member) {
  return Boolean(member?.permissions?.has('Administrator'));
}

function isXpAdmin(member) {
  return Boolean(xpAdminRoleId && member?.roles?.cache?.has(xpAdminRoleId));
}

function commandAccess(commandName, member) {
  if (STAFF_COMMANDS.has(commandName)) return isStaff(member);
  if (ADMIN_COMMANDS.has(commandName)) return isServerAdmin(member);
  return true;
}

module.exports = {
  XP_ADMIN_ROLE_ID: xpAdminRoleId,
  ADMIN_COMMANDS,
  STAFF_COMMANDS,
  isStaff,
  isServerAdmin,
  isXpAdmin,
  commandAccess
};
