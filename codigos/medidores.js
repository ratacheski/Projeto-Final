const urlConexaoCCK = require('../Parameters/config.json').urlConexaoCCK
const pool = require('../ConnectionFactory/pool-factory')
const urlListagem = urlConexaoCCK + "?id_medidor=?"
const fetch = require('node-fetch')
const xml2js = require('xml2js')
const validator = require('../Utils/validator.js')

var medidoresRetornoCCK = [];
var medidoresCCK = [];
var medidoresToAdd = [];
var query = "";

class Medidor {
    constructor(id, denominacao, tipo, latitude, longitude, medidorEnel, dataPrimeiraLeitura, dataUltimaLeitura) {
        this.id = id;
        this.denominacao = denominacao;
        this.tipo = tipo;
        this.latitude = latitude;
        this.longitude = longitude;
        this.medidorEnel = medidorEnel;
        this.dataPrimeiraLeitura = dataPrimeiraLeitura;
        this.dataUltimaLeitura = dataUltimaLeitura;
    }
}

exports.sincronizaMedidoresCCK = async function () {
    console.log('listando medidores CCK')
    medidoresCCK = await listaMedidoresCCK();
    medidoresCCK = await processaDatasMedidores(medidoresCCK)
    await listaMedidoresBanco(medidoresCCK);
    console.log('Atualizando medidores do Banco')
    await insereMedidoresNoBanco(medidoresCCK);
    return medidoresCCK
}

async function listaMedidoresCCK() {
    return new Promise((resolve, reject) => {
        var retornoConsulta = [];

        fetch(urlListagem).then(function (u) {
            return u.text().then(function (val) {
                xml2js.parseString(val, { trim: true }, function (err, result) {
                    medidoresRetornoCCK = JSON.parse(JSON.stringify(result))
                    medidoresRetornoCCK.medidores.medidor.forEach(function (medidor) {
                        var medidorToAdd = 
                        new Medidor(medidor.$.id_medidor,medidor.$.nm_medidor);
                        retornoConsulta.push(medidorToAdd);                        
                    });
                });
                resolve(retornoConsulta);
            }).catch(function (err) {
                // handle error here
            });
        });
        
    });

}

const listaDatasMedicoesMedidorCCK = async (medidor) => {
    var urlBusca = urlConexaoCCK + "?id_medidor=" + medidor.id;
    const res = await fetch(urlBusca);
    const data = await res.text();
    xml2js.parseString(data, { trim: true }, function (err, result) {
        var medidorRetornoCCK = JSON.parse(JSON.stringify(result));
        if (!!medidorRetornoCCK && !!medidorRetornoCCK.medidor) {
            medidor.dataPrimeiraLeitura = medidorRetornoCCK.medidor.datahora_pri[0];
            medidor.dataUltimaLeitura = medidorRetornoCCK.medidor.datahora_ult[0];
        }

    });
    return medidor;

}

async function listaMedidoresBanco(medidoresCCK) {
    const client = await pool.connect();
    const result = await pool.query({
        rowMode: 'json',
        text: 'SELECT t.id as id, t.denominacao as denominacao FROM sideufg_medidor AS t'
    });
    for (var i = 0; i < medidoresCCK.length; i++) {
        var insere = true
        for (var j = 0; j < result.rows.length; j++) {
            if (result.rows[j].id == medidoresCCK[i].id) {
                insere = false
            }
        }
        if (insere) {
            medidoresToAdd.push(medidoresCCK[i])
        }
    }
    await client.end();
}

async function insereMedidoresNoBanco(medidoresToInsert) {
    if (medidoresToInsert.length > 0) {
        query = "INSERT into sideufg_medidor(id,denominacao,data_primeira_leitura,data_ultima_leitura) VALUES ";
        for (var i = 0; i < medidoresToInsert.length; i++) {
            if (i < medidoresToInsert.length - 1) {
                query += "('" + medidoresToInsert[i].id + "', '" + medidoresToInsert[i].denominacao + "', "
                    + validator.validaDataPostgres(medidoresToInsert[i].dataPrimeiraLeitura) + ", "
                    + validator.validaDataPostgres(medidoresToInsert[i].dataUltimaLeitura) + ") , "
            } else if (i == medidoresToInsert.length - 1) {
                query += "('" + medidoresToInsert[i].id + "', '" + medidoresToInsert[i].denominacao + "', "
                    + validator.validaDataPostgres(medidoresToInsert[i].dataPrimeiraLeitura) + ", "
                    + validator.validaDataPostgres(medidoresToInsert[i].dataUltimaLeitura) + ") "
            }


        }
        query += "ON CONFLICT (id) DO UPDATE SET data_primeira_leitura = EXCLUDED.data_primeira_leitura, "
            + "data_ultima_leitura = EXCLUDED.data_ultima_leitura"
        const client = await pool.connect();
        const result = await pool.query({
            rowMode: 'json',
            text: query
        });
        await client.end();
    }
}

async function processaDatasMedidores(medidores) {
    return new Promise((resolve, reject) => {
        medidores = medidores.map(async medidor => {
            medidor = await listaDatasMedicoesMedidorCCK(medidor);
            return medidor;
        });

        (async () => {
            const resultado = await Promise.all(medidores);
            resolve(resultado)
        })();

    });

}







