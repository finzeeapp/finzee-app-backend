const now = new Date();
const offsetSP = -3 * 60;
const offsetLocal = now.getTimezoneOffset();
const diffMinutes = offsetLocal - offsetSP;
const nowSP = new Date(now.getTime() + diffMinutes * 60000);
const next = new Date(nowSP);

next.setHours(8, 0, 0, 0);

if (nowSP.getHours() >= 8) {
  next.setDate(next.getDate() + 1);
}

const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const diaSemana = dias[next.getDay()];
const dia = next.getDate();
const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mes = meses[next.getMonth()];
const ano = next.getFullYear();

console.log(`${diaSemana}, ${dia} de ${mes} de ${ano} às 08:00`);
