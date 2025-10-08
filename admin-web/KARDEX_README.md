# Módulo de Consulta de Kardex

## Descripción
Este módulo permite consultar los movimientos de kardex por forma de pago y fecha específica, mostrando información detallada de materiales, cantidades y valores.

## Configuración

### 1. Variables de Entorno
Crear un archivo `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Backend (Node.js)
El backend ya está configurado con el endpoint:
- `GET /api/kardex/formapago?fecha=YYYY-MM-DD&formapago=MU`

### 3. Frontend (Next.js)
La vista está disponible en: `/dashboard/kardex`

## Funcionalidades

### Filtros de Consulta
- **Fecha**: Selección de fecha específica (formato YYYY-MM-DD)
- **Forma de Pago**: Dropdown con opciones predefinidas
  - MU - Efectivo
  - TC - Tarjeta de Crédito
  - TD - Tarjeta Débito
  - TR - Transferencia
  - CH - Cheque
- **Botón "Hoy"**: Selecciona automáticamente la fecha actual

### Estadísticas Mostradas
- Total de registros encontrados
- Cantidad total de materiales
- Valor total de la consulta
- Forma de pago seleccionada

### Tabla de Resultados
- Código del material
- Descripción del material
- Unidad de medida
- Forma de pago (código y descripción)
- Cantidad total
- Valor total

## Estructura de Archivos

```
src/
├── app/dashboard/kardex/
│   └── page.tsx                 # Página principal de kardex
├── components/kardex/
│   ├── KardexFilters.tsx       # Componente de filtros
│   ├── KardexStats.tsx         # Componente de estadísticas
│   └── KardexTable.tsx         # Componente de tabla
├── lib/
│   └── admin-kardex.ts         # Servicios API para kardex
└── types/
    └── index.ts                # Tipos TypeScript (actualizado)
```

## Uso

1. Navegar a `/dashboard/kardex`
2. Seleccionar una fecha (usar el botón "Hoy" para fecha actual)
3. Seleccionar forma de pago (por defecto: MU)
4. Hacer clic en "Consultar"
5. Ver los resultados en la tabla y estadísticas

## Consulta SQL Implementada

```sql
SELECT
    CAST(k.fecha AS DATE) AS fecha,
    k.formapago AS formapago_kardex,
    m.codigo AS codigo_material,
    m.descrip AS descripcion_material,
    m.unidad AS unidad_material,
    fp.codigo AS codigo_formapago,
    fp.descrip AS descripcion_formapago,
    SUM(dk.canmat) AS total_cantidad,
    SUM(dk.canmat * dk.preciovta) AS total_valor
FROM kardex k
JOIN dekardex dk ON dk.kardexid = k.kardexid
JOIN material m ON m.matid = dk.matid
JOIN dekardexfp dkfp ON dkfp.kardexid = k.kardexid
JOIN formapago fp ON fp.formapagoid = dkfp.formapagoid
WHERE k.formapago = ? AND CAST(k.fecha AS DATE) = ?
GROUP BY
    CAST(k.fecha AS DATE),
    k.formapago,
    m.codigo,
    m.descrip,
    m.unidad,
    fp.codigo,
    fp.descrip
ORDER BY m.codigo, fp.codigo
```

## Notas Técnicas

- Utiliza React Query para el manejo de estado y cache
- Diseño responsive con Tailwind CSS
- Formateo de números en formato colombiano
- Manejo de estados de carga y errores
- Validación de fechas en el frontend
