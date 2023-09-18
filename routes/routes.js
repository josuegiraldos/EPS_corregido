const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const moment = require('moment');
require('dotenv').config();

const router = express.Router();

const bases = process.env.DDBB256;
const nombrebase = 'EPS';

router.get('/endpoint1', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('usuario');
        const result = await collection.find().sort({ usu_nombre: 1 }).toArray();
        res.json({
            msg: "Obtener pacientes de manera alfabética (por primer nombre).",
            result
        });
        client.close();
    } catch (error) {
        console.log(error, "Error endpoint1.");
    }
});

router.get('/endpoint2', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('cita');
        const query = { cit_fecha: "14-09-2023" };
        const result = await collection
            .aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: 'usuario',
                        localField: 'cit_datosUsuario',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        cit_fecha: 1,
                        'usuario.usu_nombre': 1,
                        'usuario.usu_segdo_nombre': 1,
                        'usuario.usu_primer_apellido': 1,
                        'usuario.usu_segdo_apellido': 1
                    }
                }
            ])
            .sort({ 'usuario.usu_nombre': 1 })
            .toArray();
        
            res.json({
                msg: "Obtener citas por fecha (fecha: 14-09-2023) ordenando los pacientes de manera alfabética (primer nombre).",
                result
            });
    } catch (error) {
        console.log(error, "Error endpoint2.");
    }
});

router.get('/endpoint3', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('medico');
        const query = { med_especialidad: new ObjectId('6502f7c9928eaf03e12bd965') };

        const result = await collection.aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: 'consultorio',
                    let: { consultorioId: '$med_consultorio' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$consultorioId'] }
                            }
                        }
                    ],
                    as: 'consultorio'
                }
            },
            {
                $lookup: {
                    from: 'especialidad',
                    let: { especialidadId: '$med_especialidad' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$especialidadId'] }
                            }
                        }
                    ],
                    as: 'especialidad'
                }
            },
            {
                $unwind: '$consultorio'
            },
            {
                $unwind: '$especialidad'
            },
            {
                $project: {
                    _id: 1,
                    med_nroMatriculaProfesional: 1,
                    med_nombreCompleto: 1,
                    med_consultorio: '$consultorio',
                    med_especialidad: '$especialidad'
                }
            }
        ]).toArray();

        res.json({
            msg: "Obtener médico por especialidad (Cardiología clínica) con datos completos de consultorio y especialidad.",
            result
        });
        client.close();
    } catch (error) {
        console.error(error, "Error endpoint3.");
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

router.get('/endpoint4', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('cita');
        const currentDate = moment().format('DD-MM-YYYY');
        const query = {
            cit_datosUsuario: new ObjectId('650302f6928eaf03e12bd99a'),
            cit_fecha: { $gt: currentDate }
        };

        const result = await collection
            .aggregate([
                {
                    $match: query
                },
                {
                    $lookup: {
                        from: 'usuario',
                        localField: 'cit_datosUsuario',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        cit_fecha: 1,
                        'usuario.usu_nombre': 1,
                        'usuario.usu_segdo_nombre': 1,
                        'usuario.usu_primer_apellido': 1,
                        'usuario.usu_segdo_apellido': 1
                    }
                }
            ])
            .sort({ cit_fecha: 1 })
            .limit(1)
            .toArray();

        if (result.length > 0) {
            res.json({
                msg: "Próxima cita para el paciente:",
                cita: result[0]
            });
        } else {
            res.json({
                msg: "El paciente no tiene citas próximas.",
                cita: null
            });
        }
        client.close();
    } catch (error) {
        console.error(error, "Error endpoint4.");
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

router.get('/endpoint5', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('cita');
        const query = { 'cit_medico': new ObjectId('6502fcc9928eaf03e12bd98f')};
        /* const result = await colection.find(query).toArray(); */
        const result = await collection.aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: 'estado_cita',
                    localField: 'cit_estadoCita',
                    foreignField: '_id',
                    as: 'estadoCita'
                }
            },
            {
                $lookup: {
                    from: 'medico',
                    localField: 'cit_medico',
                    foreignField: '_id',
                    as: 'medico'
                }
            },
            {
                $lookup: {
                    from: 'usuario',
                    localField: 'cit_datosUsuario',
                    foreignField: '_id',
                    as: 'usuario'
                }
            },
            {
                $project: {
                    _id: 1,
                    cit_fecha: 1,
                    cit_estadoCita: { $arrayElemAt: ['$estadoCita.estcita_nombre', 0] },
                    cit_medico: { $arrayElemAt: ['$medico.med_nombreCompleto', 0] },
                    cit_datosUsuario: {
                        $concat: [
                            { $arrayElemAt: ['$usuario.usu_nombre', 0] },
                            ' ',
                            { $arrayElemAt: ['$usuario.usu_primer_apellido', 0] },
                            ' ',
                        ]
                    }
                }
            }
        ]).toArray();

        res.json({
            msg: "Pacientes que tienen cita con un médico en específico.",
            result
        });
        client.close();
    } catch (error) {
        console.log(error, "Error endpoint5.");
    }
});

router.get('/endpoint6', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('cita');
        const query = { cit_fecha: "14-09-2023" };

        const result = await collection.aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: 'estado_cita',
                    localField: 'cit_estadoCita',
                    foreignField: '_id',
                    as: 'estadoCita'
                }
            },
            {
                $lookup: {
                    from: 'medico',
                    localField: 'cit_medico',
                    foreignField: '_id',
                    as: 'medico'
                }
            },
            {
                $lookup: {
                    from: 'usuario',
                    localField: 'cit_datosUsuario',
                    foreignField: '_id',
                    as: 'usuario'
                }
            },
            {
                $project: {
                    _id: 1,
                    cit_fecha: 1,
                    cit_estadoCita: { $arrayElemAt: ['$estadoCita.estcita_nombre', 0] },
                    cit_medico: { $arrayElemAt: ['$medico.med_nombreCompleto', 0] },
                    cit_datosUsuario: {
                        $concat: [
                            { $arrayElemAt: ['$usuario.usu_nombre', 0] },
                            ' ',
                            { $arrayElemAt: ['$usuario.usu_segdo_nombre', 0] },
                            ' ',
                            { $arrayElemAt: ['$usuario.usu_primer_apellido', 0] },
                            ' ',
                            { $arrayElemAt: ['$usuario.usu_segdo_apellido', 0] }
                        ]
                    }
                }
            }
        ]).toArray();

        res.json({
            msg: "Obtener citas por fecha (fecha: 14-09-2023).",
            result
        });
        client.close();
    } catch (error) {
        console.log(error, "Error endpoint6.");
    }
});

router.get('/endpoint7', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('medico');
        const result = await collection.aggregate([ 
            {
                $lookup: {
                    from: 'consultorio',
                    let: { consultorioId: '$med_consultorio' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$consultorioId'] }
                            }
                        }
                    ],
                    as: 'consultorio'
                }
            },
            {
                $lookup: {
                    from: 'especialidad',
                    let: { especialidadId: '$med_especialidad' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$especialidadId'] }
                            }
                        }
                    ],
                    as: 'especialidad'
                }
            },
            {
                $unwind: '$consultorio'
            },
            {
                $unwind: '$especialidad'
            },
            {
                $project: {
                    _id: 1,
                    med_nroMatriculaProfesional: 1,
                    med_nombreCompleto: 1,
                    med_consultorio: '$consultorio',
                    med_especialidad: '$especialidad'
                }
            }
        ]).toArray();
        res.json({
            msg: "Médico con su respectivo consultorio y especialidad.",
            result
        })
        client.close();
    } catch (error) {
        console.log(error, "Error endpoint7.");
    }
});

router.get('/endpoint8', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('cita');
        const query = { cit_medico: new ObjectId('6502fcc9928eaf03e12bd98f')};
        const citas = await collection.countDocuments(query);
        const result = await collection.aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: 'estado_cita',
                    localField: 'cit_estadoCita',
                    foreignField: '_id',
                    as: 'estadoCita'
                }
            },
            {
                $lookup: {
                    from: 'medico',
                    localField: 'cit_medico',
                    foreignField: '_id',
                    as: 'medico'
                }
            },
            {
                $lookup: {
                    from: 'usuario',
                    localField: 'cit_datosUsuario',
                    foreignField: '_id',
                    as: 'usuario'
                }
            },
            {
                $project: {
                    _id: 1,
                    cit_fecha: 1,
                    cit_estadoCita: { $arrayElemAt: ['$estadoCita.estcita_nombre', 0] },
                    cit_medico: { $arrayElemAt: ['$medico.med_nombreCompleto', 0] },
                    cit_datosUsuario: {
                        $concat: [
                            { $arrayElemAt: ['$usuario.usu_nombre', 0] },
                            ' ',
                            { $arrayElemAt: ['$usuario.usu_segdo_nombre', 0] },
                            ' ',
                            { $arrayElemAt: ['$usuario.usu_primer_apellido', 0] },
                            ' ',
                            { $arrayElemAt: ['$usuario.usu_segdo_apellido', 0] }
                        ]
                    }
                }
            }
        ]).toArray();
        res.json({
            msg: "Cantidad de citas que tiene un médico en específico (_id: 6502fcc9928eaf03e12bd98f).",
            citas,
            result
        })
        client.close();
    } catch (error) {
        console.log(error, "Error endpoint8.");
    }
});

router.get('/endpoint9', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('cita');
        const query = { cit_datosUsuario: new ObjectId('650302f6928eaf03e12bd99a')};
        const result = await collection.aggregate([
            {
              $lookup: {
                from: "medico",
                localField: "cit_medico",
                foreignField: "_id",
                as: "medico",
              },
            },
            {
              $lookup: {
                from: "usuario",
                localField: "cit_datosUsuario",
                foreignField: "_id",
                as: "paciente",
              },
            },
            {
              $lookup: {
                from: "consultorio",
                localField: "medico.med_consultorio",
                foreignField: "_id",
                as: "consultorio",
              },
            },
            {
              $unwind: "$medico",
            },
            {
              $unwind: "$paciente",
            },
            {
              $unwind: "$consultorio",
            },
            {
              $group: {
                _id: new ObjectId,
                cita: {
                  $push: {
                    cit_fecha: "$cit_fecha",
                    medico: "$medico.med_nombreCompleto",
                    nombre: "$paciente.usu_nombre",
                    apellido: "$paciente.usu_primer_apellido",
                    consultorio: "$consultorio.cons_nombre",
                  },
                },
              },
            },
            {
              $unwind: "$cita"
            },
            {
                $project: {
                    _id: 0
                }
            }
          ]).sort( { "cita.cit_fecha": 1 })
          .toArray();

        if (result.length > 0) {
            res.json({
                msg: `Consultorios donde se aplicaron citas para el paciente:`,
                consultorios: result
            });
        } else {
            res.json({
                msg: `El paciente no tiene citas en consultorios.`
            });
        }
        client.close();
    } catch (error) {
        console.log(error, "Error endpoint9.");
    }
});

router.get('/endpoint10', async (req, res) => {
    try {
        const client = new MongoClient(bases);
        await client.connect();
        const db = client.db(nombrebase);
        const collection = db.collection('cita');
        const result = await collection.aggregate([
            {
                $lookup: {
                  from: "estado_cita",
                  localField: "cit_estadoCita",
                  foreignField: "_id",
                  as: "estadoCita"
                }
              },
              {
                $lookup: {
                  from: "usuario",
                  localField: "cit_datosUsuario",
                  foreignField: "_id",
                  as: "usuario"
                }
              },
              {
                $lookup: {
                  from: "genero",
                  localField: "usuario.usu_genero",
                  foreignField: "_id",
                  as: "genero"
                } 
              },
              {
                $unwind: "$estadoCita",
              },
              {
                $unwind: "$usuario"
              },
              {
                $unwind: "$genero",
              },
              {
                $match: {
                  "estadoCita.estcita_nombre": /Finalizada/i
                }
              },
              {
                $group: {
                  "_id": new ObjectId,
                  "citas_x_genero":{
                    $push:{
                      "usuario": "$usuario.usu_nombre",
                      "estadoCita": "$estadoCita.estcita_nombre",
                      "genero": "$genero.gen_nombre",
                    }
                  },
                  "total_citas": {
                    $sum: 1
                  }
                }
              },
              {
                $project: {
                  "_id": 0
                }
              }
        ]).toArray();
        res.json({
            msg: "Obtener citas de acuerdo al genero y que este 'Finalizada'",
            result
        })
    } catch (error) {
        console.log(error, "Error endpoint10.");
    }
});

module.exports = router;