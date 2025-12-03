/**
 * Role-based access control utilities
 */

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  // Team Management
  MANAGE_TEAM: [ROLES.OWNER],
  INVITE_MEMBERS: [ROLES.OWNER, ROLES.ADMIN],
  REMOVE_MEMBERS: [ROLES.OWNER, ROLES.ADMIN],
  
  // Project Management
  CREATE_PROJECT: [ROLES.OWNER, ROLES.ADMIN],
  DELETE_PROJECT: [ROLES.OWNER, ROLES.ADMIN],
  EDIT_PROJECT: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  
  // Task Management
  CREATE_TASK: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  DELETE_TASK: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  EDIT_ANY_TASK: [ROLES.OWNER, ROLES.ADMIN],
  EDIT_OWN_TASK: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  ASSIGN_TASK: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  
  // Comments
  ADD_COMMENT: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.VIEWER],
  DELETE_ANY_COMMENT: [ROLES.OWNER, ROLES.ADMIN],
  DELETE_OWN_COMMENT: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.VIEWER],
  
  // View Permissions
  VIEW_TEAM: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.VIEWER],
  VIEW_ANALYTICS: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.VIEWER]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(userRole, permission) {
  if (!userRole || !permission) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles && allowedRoles.includes(userRole);
}

/**
 * Check if user can edit a task
 */
export function canEditTask(userRole, userEmail, task) {
  if (hasPermission(userRole, 'EDIT_ANY_TASK')) return true;
  if (hasPermission(userRole, 'EDIT_OWN_TASK') && 
      (task.created_by === userEmail || task.assigned_to === userEmail)) {
    return true;
  }
  return false;
}

/**
 * Check if user can delete a task
 */
export function canDeleteTask(userRole, userEmail, task) {
  if (hasPermission(userRole, 'DELETE_TASK')) {
    // Members can only delete their own tasks
    if (userRole === ROLES.MEMBER) {
      return task.created_by === userEmail || task.assigned_to === userEmail;
    }
    return true;
  }
  return false;
}

/**
 * Get user's role in a team
 */
export function getUserTeamRole(teamMembers, teamId, userEmail) {
  const membership = teamMembers.find(
    tm => tm.team_id === teamId && tm.user_email === userEmail && tm.status === 'active'
  );
  return membership?.role || null;
}

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  canEditTask,
  canDeleteTask,
  getUserTeamRole
};