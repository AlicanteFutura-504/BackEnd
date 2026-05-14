# DOCUMENTO 3: AUDITORÍA TÉCNICA DE BACKEND (FASE 2)

> **Proyecto:** `bookings-backend`
> **Estado:** Post-correcciones iniciales
> **Fecha:** 14/05/2026

---

## 1. RIESGOS DE INTEGRIDAD Y CONCURRENCIA

### A. Carrera de fondo (Race Condition) en Reservas
**Fallo:** El backend valida si un horario está ocupado mediante código (`findOne` antes de `save`).
**Riesgo:** Si dos peticiones POST llegan exactamente al mismo tiempo para el mismo slot, ambas pasarán el `findOne` (porque el registro aún no se ha persistido) y ambas se guardarán, generando una **doble reserva**.
**Solución:** Añadir un índice único compuesto en la base de datos (Entidad `Appointment`).
```ts
@Entity()
@Unique(['date', 'time', 'businessId']) // Garantiza integridad a nivel DB
export class Appointment { ... }
```

### B. Falta de Integridad Referencial
**Fallo:** Los `customerId` y `businessId` son simples enteros (`number`) sin relación con tablas maestras de Clientes o Negocios.
**Riesgo:** Se pueden crear reservas para clientes o negocios que no existen (IDs huérfanos).
**Solución:** Implementar las entidades `Customer` y `Business` y usar relaciones `@ManyToOne`.

---

## 2. DESCONEXIÓN DE DOMINIOS (PAGOS vs CITAS)

### A. Entidades huérfanas
**Fallo:** La entidad `Payment` no tiene ninguna relación con `Appointment`.
**Riesgo:** Es imposible trazar qué pago corresponde a qué cita de forma automatizada. Solo se puede "adivinar" por el nombre del cliente y el importe.
**Solución:** Añadir un campo `appointmentId` o una relación `@OneToOne` en `Payment`.

### B. Desincronización de Estados
**Fallo:** `Appointment` tiene un estado `PAID` (Pagado), pero marcar una cita como pagada no genera un registro en la tabla `Payment`, ni viceversa.
**Riesgo:** Inconsistencia contable. El listado de cobros puede no coincidir con el estado de las citas.
**Solución:** Implementar un servicio que gestione la transición a `PAID` y cree el registro de pago en una misma **transacción**.

---

## 3. ESCALABILIDAD Y RENDIMIENTO

### A. Ausencia de Paginación
**Fallo:** El método `findAll()` de ambos servicios devuelve **todos** los registros de la base de datos.
**Riesgo:** Cuando el sistema tenga 10.000 reservas, la petición tardará segundos, consumirá mucha RAM y podría bloquear el servidor (DoS involuntario).
**Solución:** Implementar `take` y `skip` en TypeORM (Paginación).

### B. Eliminación Permanente (Hard Delete)
**Fallo:** El endpoint `DELETE` borra físicamente la fila de la DB.
**Riesgo:** Pérdida total de datos históricos y analíticos. Si un usuario borra por error, no hay recuperación.
**Solución:** Usar `@DeleteDateColumn` de TypeORM para implementar **Soft Delete** (borrado lógico).

---

## 4. DEUDA TÉCNICA MENOR

### A. Duplicidad de Lógica (Helper de Fecha)
**Fallo:** El método `getLocalToday()` está definido dentro de `AppointmentsService`. Si se necesita en `PaymentsService`, habrá que duplicarlo o moverlo.
**Solución:** Crear una carpeta `utils` o `common` para funciones auxiliares de fecha.

### B. Tipado entre Proyectos
**Fallo:** El Frontend define sus propios tipos que "imitan" a los del Backend.
**Riesgo:** Si cambias un nombre de campo en el Backend (ej: `customerId` -> `userId`), el Frontend seguirá compilando pero fallará en tiempo de ejecución (Conflictos de contrato).
**Solución:** Usar un monorepo real con un paquete de `shared-types` o generar el cliente del frontend automáticamente con OpenAPI/Swagger.

---

## RESUMEN DE PRIORIDADES

| Prioridad | Fallo | Tipo | Impacto |
|-----------|-------|------|---------|
| 🔴 Crítica | Carrera de fondo | Concurrencia | Dobles reservas accidentales |
| 🟠 Alta | Sin Paginación | Rendimiento | Caída del sistema con muchos datos |
| 🟠 Alta | Desconexión Pagos/Citas | Lógica | Inconsistencia de datos contables |
| 🟡 Media | Hard Delete | Seguridad | Pérdida accidental de información |
