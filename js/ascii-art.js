/* ===== Artchive // arte del globo de la portada =====
   El dibujo de aquí abajo se pinta sobre el globo ASCII del centro de la portada
   (js/orbit.js lo envuelve sobre la esfera y lo hace girar).

   PARA CAMBIARLO: borra el dibujo que hay entre las dos comillas invertidas ` y pega el
   tuyo en su lugar. Guarda el archivo y recarga la página. No hace falta tocar nada más.

   Reglas:
   - Los espacios son "huecos": ahí se ve la cuadrícula del globo. Todo lo demás es dibujo.
   - Tamaño recomendado: unas 20 a 30 columnas de ancho y 15 a 20 líneas de alto.
     Se estira para ocupar siempre la misma zona del globo; si es mucho más grande pierde
     detalle, y si es muy ancho o muy alto se ve aplastado.
   - El dibujo NO puede llevar el carácter ` (comilla invertida) ni la pareja ${ .
     Si tu arte los tiene, cámbialos por ' y por $ { (con un espacio).
   - Los caracteres "llenos" (@ # $ S M W) dibujan formas más marcadas que los finos (. , : ').
*/
window.Artchive = window.Artchive || {};

Artchive.ASCII_ART = String.raw`
             .;iiiii;
            diIIIS$IIIi,
           jiIIS$$$SSIIi:
           $iIS$S$$$S$Sii
           ?IIS$$$S$$SIiS
           ;iI$S$$$$SSIi?
           S"""4$$7""4SS:
     _,::. ?._ ,$S:   S7
  .:i$$i-:  '4$' ?$S%7'
 ::i$$SI:-.   '?S$7'j
:i:?IS$I:i?   :u,,[p7 ,;.
.:-:iS$S:i:    '"""' d7j:.
: -:iISS:Si  './47\ J7,vp:
:   :ISI ?I     ?  j7 $i;.
:    ;ii i:     ;  S'ji;.
   .: :; :-     i ,? I:.
        -:        ;i ;`;
