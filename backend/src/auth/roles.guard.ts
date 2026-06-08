import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../usuarios/usuario.entity';
import { ROLES_KEY } from './roles.decorator';

/**
 * Guard para validar si el usuario autenticado tiene el rol necesario para acceder a la ruta.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // Si no hay roles requeridos, se permite el acceso (otras guards como JWT pueden bloquearlo de todos modos)
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.role) {
      return false; // Sin usuario o rol en el JWT, acceso denegado
    }
    
    // El SUPERADMIN tiene acceso a todo.
    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }
    
    return requiredRoles.includes(user.role);
  }
}
