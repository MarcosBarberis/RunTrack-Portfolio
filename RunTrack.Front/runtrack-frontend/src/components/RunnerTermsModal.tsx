import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiClient, getRunnerUsername } from "../services/api";

const TERMS_TEXT = `
--NORMAS DE CONVIVENCIA Y DINÁMICA DEL GRUPO.

El running es una actividad deportiva que estimula el sistema cardiovascular, respiratorio y musculoesquelético.
Como toda práctica física, requiere constancia, compromiso y, por sobre todo, responsabilidad.

Requisitos obligatorios

-Deslinde de responsabilidad
Cada corredor deberá firmar un deslinde de responsabilidad, en el cual se compromete a asumir la responsabilidad por cualquier eventualidad o incidente que pudiera surgir durante la práctica. Este documento es obligatorio y complementa el apto médico.
-Apto médico actualizado
Es obligatorio presentar un certificado médico de aptitud física (EMAC) que autorice expresamente la práctica de actividad física, en particular running.
--------------------------------------------------------------------

--Normas generales de convivencia y responsabilidad personal
Además del entrenamiento físico, este grupo se construye sobre valores que elegimos cultivar día a día. Nuestros valores son los pilares nos definen y sostienen el trabajo conjunto.
-Respeto por el plan de entrenamiento
Seguí el plan tal como está propuesto. No saltees días de entrenamiento ni sumes kilómetros que no están planificados sin consultarme. Nuestros planes son intransferibles. Es algo que preparo cuidadosamente y con mucho trabajo, y está destinado únicamente a quienes forman parte del equipo.
-Las preparaciones específicas para carreras o planes completamente personalizados tienen un costo adicional.
-Contenido externo
No sigas consejos vistos en redes sociales sin consultarme. Mucho de ese contenido no está adaptado a tu nivel ni a la metodología del grupo y puede interferir con tu progreso o generar lesiones.
-Importancia del descanso
El descanso es tan importante como la actividad. No lo saltees ni agregues entrenamientos por tu cuenta sin coordinación previa.
-Otras actividades físicas
Si realizas otras actividades (gimnasio, natación, fútbol, etc.), asegúrate de que tu entrenador/a adapte ese plan a tu entrenamiento de running. La carga total debe ser coherente para evitar el sobre entrenamiento.
--------------------------------------------------------------------

--Dudas, incomodidades o sugerencias

Si algo del plan o de la dinámica grupal no te cierra, decímelo sin problema. Estoy para acompañarlos y buscar juntos lo que mejor funcione para cada uno. 
--------------------------------------------------------------------

--Fotos y videos en los entrenamientos

El espacio donde entrenamos es público, pero la clase es privada. Por eso necesitamos ser cuidadosos con lo que grabamos o fotografiamos. Si quieren sacar alguna foto donde hay otras personas, me consultan y les indico si está todo bien. (No aplica a selfies, fotos personales, fotos de relojes, fotos entre ustedes, etc. ) ¡Amo que compartan contenido en Instagram!
--------------------------------------------------------------------

--Ausencias y continuidad

Si alguien está ausente por un período prolongado y su cuota ya venció, consultaré si desea continuar. 
En caso de no recibir respuesta, o decidir no continuar, se eliminará del grupo hasta que decida retomar, para mantener todo organizado.
--------------------------------------------------------------------

--Calendario de carreras

En la descripción del grupo de WhatsApp se encuentra el link al calendario de carreras del equipo. Pueden proponer nuevas carreras: simplemente me avisan por privado y las agregamos. De esta manera, entre todos elegimos y coordinamos en cuáles participar.
--------------------------------------------------------------------

--Invitación de nuevos participantes

Si querés invitar a un/a compañero/a a entrenar, debe comunicarse previamente conmigo sin excepción.
--------------------------------------------------------------------

--Molestias y dolores persistentes.

Si experimentas un dolor crónico, que se extiende durante varios días, es fundamental detener la actividad y consultar a un especialista de la salud antes de continuar entrenando. Es indispensable que me avises de cualquier molestia, dolor o sobrecarga. No puede suceder que estés entrenando con dolor sin que yo lo sepa. La comunicación me permite acompañarte, ajustar el plan y ayudarte a prevenir lesiones mayores.
--------------------------------------------------------------------

--Cuidado del contenido compartido en el grupo de WhatsApp

Además del grupo general de WhatsApp, compartimos grupos más pequeños, donde coordinamos los fondos del fin de semana y actividades/ charlas extras. Cuando alguien avanza o retrocede de nivel, también se cambia al grupo correspondiente. Esto permite que cada persona entrene con quienes están en una etapa similar y, al mismo tiempo, que los grupos se consoliden y se sostengan entre sí.
Evitemos enviar mensajes, comentarios, imágenes o videos que puedan resultar ofensivos, discriminatorios o que generen incomodidad en el grupo. No se permite compartir contenido relacionado con política, religión, sexismo, o cualquier material que pueda vulnerar los valores de convivencia del equipo.
--------------------------------------------------------------------
--Compañerismo y dinámica de los grupos

En este equipo nadie corre solo. Si un compañero queda atrás, lo acompañamos, A veces somos la motivación de alguien y otras veces la necesitamos nosotros. 
--------------------------------------------------------------------
--Actividades extra

Además, los invito a ser parte de las actividades extra, porque nuestro equipo no se limita únicamente al plan de entrenamiento o a las clases semanales. Somos un grupo que se elige, que se acompaña y que se sostiene.
Compartimos esfuerzos, risas, logros y también esos días en que cuesta un poco más. Cada encuentro, dentro y fuera del entrenamiento, nos une y nos recuerda que correr juntos siempre se siente mejor.
`;

export default function RunnerTermsModal({ open }: { open: boolean }) {
  const qc = useQueryClient();
  const dni = getRunnerUsername();
  const [accepted, setAccepted] = useState(false);

  const mut = useMutation({
    mutationFn: () => apiClient.acceptTerms(),
    onSuccess: async () => {
      toast.success("Términos aceptados correctamente");
      await qc.invalidateQueries({
        queryKey: ["membership", "my-status", dni],
        exact: true,
      });
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "No se pudieron aceptar los términos"),
  });

  if (!open) return null;

  const renderFormattedText = () => {
    return TERMS_TEXT.split("\n").map((line, index) => {
      if (line.startsWith("--")) {
        return (
          <div
            key={index}
            className="text-green-400 text-lg font-semibold mt-4"
          >
            {line.replace(/^--/, "")}
          </div>
        );
      }

      if (line.startsWith("-")) {
        return (
          <div key={index} className="font-bold mt-3">
            {line.replace(/^-/, "")}
          </div>
        );
      }

      return (
        <div key={index} className="mt-2 text-slate-300">
          {line}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-10 shadow-2xl relative overflow-hidden">

        {/* Watermark Logo */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}media/brand/logo2.png)`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "320px",
          }}
        />

        <div className="relative">
          <h2 className="text-3xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Términos y reglas del grupo
          </h2>

          {/* Caja grande */}
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-6 max-h-[55vh] overflow-y-auto text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {renderFormattedText()}
          </div>

          <label className="mt-6 flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-4 h-4 accent-primary-500"
            />
            He leído y acepto los términos y condiciones
          </label>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => mut.mutate()}
              disabled={!accepted || mut.isPending}
              className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              type="button"
            >
              {mut.isPending ? "Guardando..." : "Acepto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

