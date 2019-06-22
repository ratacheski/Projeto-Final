const urlConexaoCCK = require('../Parameters/config.json').urlConexaoCCK
const pool = require('../ConnectionFactory/pool-factory')
const formatter = require('../Utils/formatter.js')
const validator = require('../Utils/validator.js')
const fetch = require('node-fetch')
const xml2js = require('xml2js')

var medicoesCCK = [];

class Leitura {
    constructor(dataMedicao, potenciaAtiva, potenciaReativa, idMedidor) {
        this.dataMedicao = dataMedicao;
        this.potenciaAtiva = potenciaAtiva;
        this.potenciaReativa = potenciaReativa;
        this.idMedidor = idMedidor;
    }
}

exports.sincronizaMedicoesCCK = async function (medidor) {
    console.log('listando medições Medidor ' + medidor.denominacao)
    var ultimaLeitura = await buscaUltimaLeituraMedidorNoBanco(medidor);
    if (!!ultimaLeitura.dataMedicao) {
        medicoesCCK = await listaUltimasLeituras(ultimaLeitura);
    } else {
        medicoesCCK = await listaTodasLeituras(medidor);
    }
    if (medicoesCCK.length > 0) {
        console.log('Inserindo ' + medicoesCCK.length 
            + ' medições do Medidor ' + medidor.denominacao);
        await insereMedicoesNoBanco(medicoesCCK);
    }
}

async function buscaUltimaLeituraMedidorNoBanco(medidor) {
    var query = "SELECT MAX(data_medicao) AS data_medicao, m.potencia_ativa, m.potencia_reativa, m.medidor_id" +
        " FROM sideufg_medicao as m WHERE medidor_id = '" + medidor.id + "'" +
        " GROUP BY m.potencia_ativa, m.potencia_reativa, m.medidor_id" +
        " order by data_medicao desc limit 1";
    const client = await pool.connect();
    const result = await pool.query({
        rowMode: 'json',
        text: query
    });
    if (!!result.rows[0]) {
        medicao = new Leitura(result.rows[0].data_medicao, result.rows[0].potencia_ativa,
            result.rows[0].potencia_reativa, result.rows[0].medidor_id)
        await client.end();
        return medicao;
    } else {
        await client.end();
        return new Leitura();
    }
}

async function listaUltimasLeituras(leitura) {
    return new Promise((resolve, reject) => {
        var retornoConsulta = [];
        const urlListagem = urlConexaoCCK + "?id_medidor=" + leitura.idMedidor + "&datahora_ini="
            + formatter.formataDataHoraWebService(incrementaHoraIntervalo(leitura.dataMedicao, 0));

        fetch(urlListagem).then(function (u) {
            return u.text().then(function (val) {
                xml2js.parseString(val, { trim: true }, function (err, result) {
                    medicoesRetornoCCK = JSON.parse(JSON.stringify(result))
                    if (!!medicoesRetornoCCK.telemetria) {
                        medicoesRetornoCCK.telemetria.medidor[0].leitura.forEach(function (leituraRetorno) {
                            var leituraToAdd = new Leitura(leituraRetorno.datahora[0], leituraRetorno.ativa[0], leituraRetorno.reativa[0], leitura.idMedidor);
                            retornoConsulta.push(leituraToAdd);
                        });
                    }
                });
                resolve(retornoConsulta);
            }).catch(function (err) {
                // handle error here
            });
        });
    });
}

async function listaTodasLeituras(medidor) {
    return new Promise((resolve, reject) => {
        var retornoConsulta = [];
        const urlListagem = urlConexaoCCK + "?id_medidor=" + medidor.id + "&datahora_ini="
            + formatter.formataDataHoraWebService(incrementaHoraIntervalo(medidor.dataPrimeiraLeitura, 0));
        fetch(urlListagem).then(function (u) {
            return u.text().then(function (val) {
                xml2js.parseString(val, { trim: true }, function (err, result) {
                    if (!!result) {
                        medicoesRetornoCCK = JSON.parse(JSON.stringify(result))
                        if (!!medicoesRetornoCCK.telemetria) {
                            medicoesRetornoCCK.telemetria.medidor[0].leitura.forEach(function (leitura) {
                                var leituraToAdd = new Leitura(leitura.datahora[0], leitura.ativa[0], leitura.reativa[0], medidor.id);
                                retornoConsulta.push(leituraToAdd);
                            });
                        }
                    } else {
                        console.log(medidor.denominacao)
                    }
                });
                resolve(retornoConsulta);
            }).catch(function (err) {
                // handle error here
            });
        });
    });
}

async function insereMedicoesNoBanco(medicoes) {
    if (medicoes.length > 0) {
        query = "INSERT into sideufg_medicao(id, data_medicao,potencia_ativa,potencia_reativa,medidor_id) VALUES ";
        for (var i = 0; i < medicoes.length; i++) {
            if (i < medicoes.length - 1) {
                query += "(newid(), " + validator.validaDataPostgres(medicoes[i].dataMedicao) + ", '"
                    + medicoes[i].potenciaAtiva + "', '"
                    + medicoes[i].potenciaReativa + "', '"
                    + medicoes[i].idMedidor + "') , "
            } else if (i == medicoes.length - 1) {
                query += "(newid(), " + validator.validaDataPostgres(medicoes[i].dataMedicao) + ", '"
                    + medicoes[i].potenciaAtiva + "', '"
                    + medicoes[i].potenciaReativa + "', '"
                    + medicoes[i].idMedidor + "') "
            }


        }
        const client = await pool.connect();
        const result = await pool.query({
            rowMode: 'json',
            text: query
        });
        await client.end();
    }
}

function incrementaHoraIntervalo(data, incrementoEmMinutos) {
    var date = new Date(data);
    return new Date(date.getTime() + incrementoEmMinutos * 60000);
}