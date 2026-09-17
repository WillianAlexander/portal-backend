import { PrismaClient, RolUsuario } from '@prisma/client';

// azureOid coincide con cempleado para facilitar las pruebas con dev tokens
// Los usuarios reales llevan su OID real de Azure AD
const usuarios: Array<{
  cempleado: string;
  azureOid: string;
  cedula: string;
  nombre: string;
  cargo: string;
  departamento: string;
  email: string;
  rol: RolUsuario;
}> = [
  { cempleado: 'user01',   azureOid: 'user01',                                cedula: '0102030401', nombre: 'Ana Martínez',                  cargo: 'Analista',        departamento: 'Recursos Humanos', email: 'ana.martinez@coopgualaquiza.fin.ec',      rol: 'EMPLEADO' },
  { cempleado: 'user02',   azureOid: 'user02',                                cedula: '0506070802', nombre: 'Carlos López',                  cargo: 'Auxiliar',        departamento: 'Contabilidad',     email: 'carlos.lopez@coopgualaquiza.fin.ec',      rol: 'EMPLEADO' },
  { cempleado: 'user03',   azureOid: 'user03',                                cedula: '2122232403', nombre: 'Luis Flores',                   cargo: 'Técnico',         departamento: 'Sistemas',         email: 'luis.flores@coopgualaquiza.fin.ec',       rol: 'EMPLEADO' },
  { cempleado: 'jefe01',   azureOid: 'jefe01',                                cedula: '1112131401', nombre: 'María García',                  cargo: 'Jefa de RR.HH.',  departamento: 'Recursos Humanos', email: 'maria.garcia@coopgualaquiza.fin.ec',      rol: 'JEFE'     },
  { cempleado: 'jefe02',   azureOid: 'jefe02',                                cedula: '1617181602', nombre: 'Pedro Soto',                    cargo: 'Supervisor',      departamento: 'Contabilidad',     email: 'pedro.soto@coopgualaquiza.fin.ec',        rol: 'JEFE'     },
  { cempleado: 'rrhh01',   azureOid: 'rrhh01',                                cedula: '3132333401', nombre: 'Sandra Vega',                   cargo: 'Coordinadora RR.HH.', departamento: 'Recursos Humanos', email: 'sandra.vega@coopgualaquiza.fin.ec',  rol: 'RRHH'     },
  { cempleado: 'admin01',  azureOid: 'admin01',                               cedula: '4142434401', nombre: 'Roberto Torres',                cargo: 'Administrador',   departamento: 'Sistemas',         email: 'roberto.torres@coopgualaquiza.fin.ec',    rol: 'ADMIN'    },
  { cempleado: 'dev-wla',  azureOid: 'abbbab98-a04b-4add-9217-6bcd8949ca3e', cedula: '0000000001', nombre: 'Lucero Arce Willian Alexander', cargo: 'Desarrollador',   departamento: 'Sistemas',         email: 'desarrollo2@coopgualaquiza.fin.ec',       rol: 'EMPLEADO' },
];

export async function seedUsuarios(prisma: PrismaClient) {
  for (const u of usuarios) {
    const existing = await prisma.tusuario.findFirst({
      where: {
        OR: [
          { cedula: u.cedula },
          ...(u.azureOid ? [{ azureOid: u.azureOid }] : []),
        ],
      },
    });
    if (existing) {
      await prisma.tusuario.update({
        where: { cempleado: existing.cempleado },
        data: {
          azureOid: u.azureOid,
          cedula: u.cedula,
          nombre: u.nombre,
          cargo: u.cargo,
          departamento: u.departamento,
          email: u.email,
          rol: u.rol,
        },
      });
    } else {
      await prisma.tusuario.create({
        data: {
          cempleado: u.cempleado,
          azureOid: u.azureOid,
          cedula: u.cedula,
          nombre: u.nombre,
          cargo: u.cargo,
          departamento: u.departamento,
          email: u.email,
          rol: u.rol,
        },
      });
    }
  }

  console.log(`  ✓ ${usuarios.length} usuarios sembrados`);
}
