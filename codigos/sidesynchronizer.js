const medidores = require('./Medidores/medidores.js')
const medicoes = require('./Medidores/medicoes.js')

var medidoresRetornados = [];
async function start () {
   medidoresRetornados = await medidores.sincronizaMedidoresCCK()
   for (var medidor of medidoresRetornados){
      await medicoes.sincronizaMedicoesCCK(medidor)
   }
   process.exit();
}


start();
