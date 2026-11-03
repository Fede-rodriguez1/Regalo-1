// Todo lo que se personaliza del regalo está en este archivo.
window.REGALO = {
  // Hash SHA-256 de la contraseña (no la contraseña en sí, para que no se lea en el código).
  // Se compara en minúsculas, sin tildes y sin espacios en los bordes.
  // Para cambiarla: node scripts/hash.mjs "nueva contraseña" y pegar el resultado acá.
  passwordHash: 'd20bdc364b3d7dfdcd81be5a3fd192d0f513fa79e92463bf0ed9efd2f46c243b',

  // Aparece si tocan "¿Necesitás una pista?". Dejar en '' para ocultar el botón.
  pista: 'Es la fecha que más me gustaba',

  // Se van rotando con cada intento fallido.
  mensajesError: [
    'Mmm… esa no es.',
    'Casi, probá de nuevo.',
    'Pensalo un poquito más 😉',
  ],

  carta: {
    titulo: '', // dejar en '' para que la carta arranque sin título
    destinatario: 'Hola Vale, feliz cumple!',
    parrafos: [
      "La verdad no sé si querías o no que te escribiera ni tampoco sé si vas a leerlo o no, pero como sabrás hoy era mi día favorito del año, en realidad supongo sigue siéndolo por eso hice esto y me encantaría poder haberlo compartido contigo pero bueno, capaz no es el mejor regalo del mundo ni lo que hubiera querido regalarte, pero creo que fue algo que me salió hacer y listo, me divertí haciéndolo, si bien mi idea era llevarte un desayuno con cosas ricas que iba a cocinar, no tenía muchas ganas así que salió esto jeje, espero que te guste, es probable que ni me respondas luego de este regalo pero de verdad quería hacértelo sin esperar nada sinceramente, tendría un montón de cosas para contarte pero ta, por ahora solo me gustaría desearte el mejor cumple.",
      "No sé si vas a estar leyendo esto el mismo día de tu cumple, pero probablemente te gane la intriga y si. Me encantaría saber cómo estás? Seguramente bien o mejor, y eso me alegra un montón, vi que ayer te dieron el título, así que felicitaciones, ni que hablar que me llena de orgullo eso, yo en otras palabras estoy bien o por lo menos intentando estar bien supongo. Ni idea qué es esto de volver al pasado y escribir cartas, media moderna esta, pero también la escribí en papel jajaja, no me desagrada, de última es más fácil expresar las cosas supongo?. Probablemente sea más cursi de lo que fui nunca, capaz decís que pesado, o ni idea, sinceramente no sé qué pensarás cuando leas esto, pero es para contarte todo lo que me ha pasado, me di cuenta que no me alcanzaron estos 10 años de conocerte, para mostrarte todo lo que te amo, era algo que tampoco me di cuenta en el momento, y me hubiera gustado hacerlo, porque sé que me quedo mucho para mostrarte Ojalá tener más tiempo en algún momento para demostrarlo, y poder volverte a hacer feliz, y bueno si no pasa supongo que también estará bien, porque obviamente serás feliz. Creo que está acá la parte “triste” podría seguir, pero prefiero decirte cosas lindas, además como te dije estoy casi seguro que vas a estar leyendo esto el día de tu cumple y no quiero amargarlo.",
      "Esto ya te lo dije en su momento, porque quiero volver a repetirlo y que por lo menos puedas tenerlo contigo.",
      "No sé si te lo debía o no, pero solo quiero contarte una parte de las cosas que me gustaban de vos y también de las que estoy agradecido.",
      "Tenes la risa más linda que conozco, por eso siempre me encantó hacerte reír, sin importar la manera, bueno ni que hablar también de tu sonrisa",
      "Sos la persona más inteligente que conozco, siempre me encantó eso de vos, como te expresas y como hablas de las cosas, quizá era más algo que admiraba pero me gustaba hacerlo.",
      "Verte dormir antes que yo siempre me encantaba, el momento en el que empezabas a tener espasmos antes de dormirte, nunca pude evitar que me dejara de causar ternura",
      "Tu sentido del humor, que te rieras de las pelotudezes que decía, que obviamente yo sé que no eran graciosas, y vos igual te reías, quizá de mí, quizá no, pero me conformo con que te sacaran una risa",
      "Tu belleza, seguramente vos mismo lo sepas pero sos una mujer muy bella, nunca te lo dije tanto, y de eso me arrepiento, pero de verdad tenes una belleza única",
      "Siempre me quejaba, pero me encantaba que te tirarás arriba mío a sacarme los puntos negros",
      "Tenes una mirada hermosa, sé que no te gusta mirar a las personas a la cara cuando hablas, pero cuando lo hacías me gustaba, y por eso también te lo pedía a veces, siento que es muy atrapante y amorosa, no se, pero es algo que me gustaba",
      "Tus abrazos? Los mejores del mundo, los más cálidos y apapachables, eso sí que los extraño",
      "Me encantaba verte cocinar, y no solo verte sino probar lo que hacías, que rico que cocinas, y gracias por hacerme probar tantas cosas nuevas",
      "Siempre olías rico a todos los lugares a donde fueras, y siempre me gustó que dejaras tu olor en mi casa, por lo menos me acordaba de vos con eso",
      "Aunque siempre que dormíamos cada uno dormía para su lado porque yo soy un quisquilloso, no podía dormirme si tener un mínimo de contacto contigo, y el calor de tu cuerpo, que por cierto siempre era mucho y eso me daba calidez y me encantaba",
      "También me gustaría darte las gracias, por acompañarme y estar en los momentos más lindos que viví en mi vida, los viajes, las películas, las comidas, los partidos del Real también, simplemente gracias",
      "Siento que hay un montón de cosas más sinceramente pero tampoco quiero que sea la biblia, solo puedo decir y agregar que por más que yo sabía que no querías casarte y todas esas cosas, hubieron varios momentos que estuve a nada de pedírtelo, creo que en mi cabeza ya tenía todo planeado, pero ta es como dato que no te aporta nada pero que me parece bueno darlo",
      "Repito nuevamente, probablemente te moleste que escriba esto o digas que pelotudo porque lo hizo, pero ta me gustó haber escrito eso, supongo también que no lo haré más, pues cada uno seguirá con supongo vida pero si algún día queres actualizarme de la tuya siempre estaré para escucharlo y ponerme feliz y orgulloso por lo que logres.",
      "Y que sepas que con vos siempre va a ser 4 de noviembre.",
    ],
    despedida: 'Te amo',
    firma: 'Fede.',
  },
};
