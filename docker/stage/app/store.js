const Promise = require('bluebird')
const client = require('prom-client')
const ip = require('ip')

require('json-circular-stringify')
const history = require('objecthistory')
const diff = require('deep-object-diff')

const registry = new client.Registry()

module.exports = function store () {

  let Seneca = this
  let senact = Promise.promisify(Seneca.act, {context: Seneca})

  client.collectDefaultMetrics({registry})

  let gauges = {}

  let associates = {}
  let descriptors = {}
  let relations = {}

  function pack (begin_ts, end_ts) {
    // pack begin_ts with 1/ e_tm
    let pe_tm = 1 / (end_ts - begin_ts)
    return begin_ts + pe_tm
  }

  Seneca.add({role:'store', cmd:'metrics.collect'}, async (msg, reply) => {

    try {
      let Seneca = this

      // Enable the collection of default metrics
      let r = (await registry.metrics())

      return reply(null,{result:r})
    } catch(e) {
      console.dir(e)
    }
  })

  Seneca.add({role:'store', cmd:'addAssociate'}, (msg,done) => {

    let begin_ts = Date.now()
    let a = Seneca.make$('associate')

    a.relations = []
    a.sid = msg.sid
    a.tid = msg.tid
    a.ts = Date.now()
    a.owner = msg.auth.user
    a.group = 'staff'
    a.perms = 511

    a.save$((e,o) => {
      associates[o.id] = history()
      associates[o.id].value = o
      Seneca.make('associate_history', {id:o.id, history:associates[o.id].$$history()}).save$()
      o.cid = msg.cid
      Seneca.act('role:reason,cmd:addAssociate',o,done)
      if (!gauges['add.associate.ts'])
        gauges['add.associate.ts'] = new client.Gauge({
          name: 'perf_store_associate_add_ts',
          help: 'ts when storing an add-associate',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['add.associate.ts'].set({event:'add.associate', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.aa:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'getAssociate'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('associate').load$(msg.id, (e,o) => {
      if (o !== null) {
        if (!associates[o.id]) {
          associates[o.id] = history()
          associates[o.id].value = o
        }

        o.cid = msg.cid
        Seneca.act('role:reason,cmd:addAssociate',o,done)
      }
      else
        o = {}
      if (!gauges['get.associate.ts'])
        gauges['get.associate.ts'] = new client.Gauge({
          name: 'perf_store_associate_get_ts',
          help: 'ts when storing an get-associate',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })
        
      gauges['get.associate.ts'].set({event:'get.associate', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.ga:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'getExistingAssociate'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('associate').load$({sid:msg.sid, tid:msg.tid}, (e,o) => {
      if (o !== null) {
        if (!associates[o.id]) {
          associates[o.id] = history()
          associates[o.id].value = o
        }

        o.cid = msg.cid
        Seneca.act('role:reason,cmd:addAssociate',o,done)
      }
      else
        o = {}
      Seneca.act('role:reason,cmd:addAssociate',o,done)
      if (!gauges['get.existing.associate.ts'])
        gauges['get.existing.associate.ts'] = new client.Gauge({
          name: 'perf_store_associate_get_existing_ts',
          help: 'ts when storing a get-existing-associate',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['get.existing.associate.ts'].set({event:'get.existing.associate', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.gea:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'updAssociate'}, (msg,done) => {

    let begin_ts = Date.now()
    let a = msg

    Seneca.make$('associate').load$(a.id, (e,o) => {
      delete o.cid
      o.data$(a).save$()
      associates[o.id].value = o
      let updates = new Array()
      let versions = associates[o.id].$$history()
      for (let i = 1; i < versions.length; i++)
        updates.push(diff.detailedDiff(versions[i-1], versions[i]))
      Seneca.make('associate_history', {id:o.id, history:updates}).save$()
      //Seneca.make('associate_history', {id:o.id, history:associates[o.id].$$history()}).save$()
      o.cid = msg.cid
      Seneca.act('role:reason,cmd:updAssociate',o,done)
      if (!gauges['upd.associate.ts'])
        gauges['upd.associate.ts'] = new client.Gauge({
          name: 'perf_store_associate_upd_ts',
          help: 'ts when storing an upd-associate',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['upd.associate.ts'].set({event:'upd.associate', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.ua:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'drpAssociate'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('associate').remove$(msg.id,done)
    delete associates[msg.id]
    Seneca.make('associate_history').remove$(msg.id,done)
    Seneca.act('role:reason,cmd:drpAssociate',{id:msg.id,cid:msg.cid},done)

    if (!gauges['drp.associate.ts'])
      gauges['drp.associate.ts'] = new client.Gauge({
        name: 'perf_store_associate_drp_ts',
        help: 'ts when storing an drp-associate',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
        registers: [registry]
      })

    gauges['drp.associate.ts'].set({event:'drp.associate', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
    //console.dir('s.da:'+msg.id)
  })

  Seneca.add({role:'store', cmd:'getRootDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('descriptor').load$({did:'metaroot'}, (e,o) => {
      if (o !== null) {
        if (!descriptors[o.id]) {
          descriptors[o.id] = history()
          descriptors[o.id].value = o
        }

        o.cid = msg.cid
        Seneca.act('role:reason,cmd:addDescriptor',o,done)
      }
      else
        o = {}

      if (!gauges['get.root.descriptor.ts'])
        gauges['get.root.descriptor.ts'] = new client.Gauge({
          name: 'perf_store_descriptor_get_root_ts',
          help: 'ts when storing an get-root-descriptor',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['get.root.descriptor.ts'].set({event:'get.root.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.grd:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'getDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('descriptor').load$(msg.id, (e,o) => {
      if (o !== null) {
        if (!descriptors[o.id]) {
          descriptors[o.id] = history()
          descriptors[o.id].value = o
        }
 
        o.cid = msg.cid
        Seneca.act('role:reason,cmd:addDescriptor',o,done)        
      } else
        o = {}

      if (!gauges['get.descriptor.ts'])
        gauges['get.descriptor.ts'] = new client.Gauge({
          name: 'perf_store_descriptor_get_ts',
          help: 'ts when storing an get-descriptor',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
        registers: [registry]
        })

      gauges['get.descriptor.ts'].set({event:'get.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.gd:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'getDescriptorHistory'}, async (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('descriptor_history').load$(msg.id, (e,o) => {
      if (!gauges['get.descriptor.history.ts'])
        gauges['get.descriptor.history.ts'] = new client.Gauge({
          name: 'perf_store_descriptor_get_history_ts',
          help: 'ts when getting version history of a descriptor',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['get.descriptor.history.ts'].set({event:'get.descriptor.history', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.gdh:'+msg.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'addRootDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    let r = Seneca.make$('descriptor')
    r.did = 'metaroot'
    r.properties = [{type:8, name:'name', value:'metaroot'}]
    r.sources = []
    r.targets = []
    r.type = 'common'
    r.ts = Date.now()
    r.owner = msg.auth.user
    r.group = 'staff'
    r.perms = 511
    r.save$((e,o) => {
      descriptors[o.id] = history()
      descriptors[o.id].value = o
      o.cid = msg.cid
      Seneca.act('role:reason,cmd:addDescriptor',o,done)

      if (!gauges['add.root.descriptor.ts'])
        gauges['add.root.descriptor.ts'] = new client.Gauge({
          name: 'perf_store_descriptor_add_root_ts',
          help: 'ts when storing an add-root-descriptor',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
        registers: [registry]
        })

      gauges['add.root.descriptor.ts'].set({event:'add.root.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.ard:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'addDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    let r = Seneca.make$('relation')
    r.type = 'describes'
    r.owner = msg.auth.user
    r.group = 'staff'
    r.perms = 511
    r.save$((e,o) => {
      let a = Seneca.make$('associate')
      a.relations = [o.id]
      a.sid = msg.pid
      a.ts = begin_ts
      a.owner = msg.auth.user
      a.group = 'staff'
      a.perms = 511
      a.save$((e,oo) => {
        let d = Seneca.make$('descriptor')
        o.aid = oo.id
        d.pid = msg.pid
        Seneca.make$('descriptor').load$(d.pid, (e,ooo) => {
          ooo.targets.push(oo.id)
          ooo.save$(done)
          descriptors[ooo.id] = history()
          descriptors[ooo.id].value = ooo
          let updates = new Array()
          let versions = descriptors[ooo.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('descriptor_history', {id:ooo.id, history:updates}).save$()
          ooo.cid = msg.cid
          Seneca.act('role:reason,cmd:updDescriptor',ooo,done)
        })
        d.x = msg.x
        d.y = msg.y
        d.rid = [o.id]
        d.rtype = [o.type]
        d.sources = [oo.id]
        d.targets = []
        d.type = msg.type
        d.ts = Date.now()
        d.owner = msg.auth.user
        d.group = 'staff'
        d.perms = 511
        d.save$((e,ooo) => {
          oo.tid = ooo.id
          o.save$(done)
          relations[o.id] = history()
          relations[o.id].value = o
          let updates = new Array()
          let versions = relations[o.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('relation_history', {id:o.id, history:updates}).save$()
          o.cid = msg.cid
          Seneca.act('role:reason,cmd:addRelation',o,done)
          oo.save$(done)
          associates[oo.id] = history()
          associates[oo.id].value = oo
          updates = new Array()
          versions = associates[oo.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('associate_history', {id:oo.id, history:updates}).save$()
          oo.cid = msg.cid
          Seneca.act('role:reason,cmd:addAssociate',oo,done)
          ooo.properties = [{type:0, name:'name', value:ooo.id}]
          ooo.save$(done)
          /*
          (async () => {await senact('role:reason,cmd:addDescriptor',
                                     ooo).then ((o) => {
                                     //{pid:ooo.pid,type:ooo.type,x:ooo.x,y:ooo.y,auth:ooo.auth}).then ((o) => {
                                       return o
                                     })})()
          */
          descriptors[ooo.id] = history()
          descriptors[ooo.id].value = ooo
          updates = new Array()
          versions = descriptors[ooo.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('descriptor_history', {id:ooo.id, history:updates}).save$()
          ooo.cid = msg.cid
          Seneca.act('role:reason,cmd:addDescriptor',ooo,done)

          if (!gauges['add.descriptor.ts'])
            gauges['add.descriptor.ts'] = new client.Gauge({
              name: 'perf_store_descriptor_add_ts',
              help: 'ts when storing an add-descriptor',
              labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
              registers: [registry]
            })

          gauges['add.descriptor.ts'].set({event:'add.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
          //console.dir('s.ad:'+ooo.id)
          done(null,ooo)
        })
      })
    })
  })

  Seneca.add({role:'store', cmd:'instantiateDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    let a = Seneca.make$('associate')
    a.relations = []
    a.sid = msg.pid
    a.ts = Date.now()
    a.owner = msg.auth.user
    a.group = 'staff'
    a.perms = 511
    a.save$((e,o) => {
      let d = Seneca.make$('descriptor')
      d.pid = msg.pid
      Seneca.make$('descriptor').load$(d.pid, (e,oo) => {
        oo.targets.push(o.id)
        oo.save$(done)
        descriptors[oo.id].value = oo
        let updates = new Array()
        let versions = descriptors[oo.id].$$history()
        for (let i = 1; i < versions.length; i++)
          updates.push(diff.detailedDiff(versions[i-1], versions[i]))
        Seneca.make('descriptor_history', {id:oo.id, history:updates}).save$()
        oo.cid = msg.cid
        Seneca.act('role:reason,cmd:updDescriptor',oo,done)
      })
      d.x = msg.x
      d.y = msg.y
      d.sources = [o.id]
      d.targets = []
      d.rid = []
      d.rtype = ['describes']
      d.type = 'instance'
      d.ts = Date.now()
      d.owner = msg.auth.user
      d.group = 'staff'
      d.perms = 511
      d.save$((e,oo) => {
        o.tid = oo.id
        o.save$(done)
        associates[o.id] = history()
        associates[o.id].value = o
        let updates = new Array()
        let versions = associates[o.id].$$history()
        for (let i = 1; i < versions.length; i++)
          updates.push(diff.detailedDiff(versions[i-1], versions[i]))
        Seneca.make('associate_history', {id:o.id, history:updates}).save$()
        o.cid = msg.cid
        Seneca.act('role:reason,cmd:addAssociate',o,done)
        oo.properties = [{type:0, name:'name', value:oo.id}]
        oo.cid = msg.cid
        oo.save$(done)
        descriptors[oo.id] = history()
        descriptors[oo.id].value = oo
        updates = new Array()
        versions = descriptors[oo.id].$$history()
        for (let i = 1; i < versions.length; i++)
          updates.push(diff.detailedDiff(versions[i-1], versions[i]))
        Seneca.make('descriptor_history', {id:oo.id, history:updates}).save$()
        oo.cid = msg.cid
        Seneca.act('role:reason,cmd:addDescriptor',oo,done)

        if (!gauges['instantiate.descriptor.ts'])
          gauges['instantiate.descriptor.ts'] = new client.Gauge({
            name: 'perf_store_descriptor_instantiate_ts',
            help: 'ts when storing an instantiate-descriptor',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
            registers: [registry]
          })

        gauges['instantiate.descriptor.ts'].set({event:'instantiate.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
        //console.dir('s.id:'+oo.id)
        done(null,oo)
      })
    })
  })

  //Seneca.add({role:'store', cmd:'pushDescriptor'}, async (msg,done) => {
  Seneca.add('role:store,cmd:pushDescriptor', (msg,done) => {

    let begin_ts = Date.now()

    let r = Seneca.make$('relation')
    r.type = msg.type
    r.owner = msg.auth.user
    r.group = 'staff'
    r.perms = 511
    r.save$((e,o) => {
      let a = Seneca.make$('associate')
      a.relations = [o.id]
      a.sid = msg.pid
      a.ts = Date.now()
      a.owner = msg.auth.user
      a.group = 'staff'
      a.perms = 511
      a.save$((e,oo) => {
        let d = Seneca.make$('descriptor')
        o.aid = oo.id
        d.pid = msg.pid
        Seneca.make$('descriptor').load$(d.pid, (e,ooo) => {
          ooo.targets.push(oo.id)
          ooo.save$(done)
          if (descriptors[ooo.id])
            descriptors[ooo.id].value = ooo
          else {
            descriptors[ooo.id] = history()
            descriptors[ooo.id].value = ooo
          }
          let updates = new Array()
          let versions = descriptors[ooo.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('descriptor_history', {id:ooo.id, history:updates}).save$()
          ooo.cid = msg.cid
          Seneca.act('role:reason,cmd:updDescriptor',ooo,done)
        })
        d.x = msg.x
        d.y = msg.y
        d.rid = [o.id]
        d.rtype = [o.type]
        //d.properties = msg.properties
        d.properties = [{type:0, name:'name', value:msg.value}]
        d.sources = [oo.id]
        d.targets = []
        d.type = 'derived'
        d.ts = Date.now()
        d.owner = msg.auth.user
        d.group = 'staff'
        d.perms = 511
        d.cid = msg.cid
        d.save$((e,ooo) => {
          oo.tid = ooo.id
          o.save$(done)
          /*
          async() => await senact('role:reason,cmd:addRelation',
                                  o).then ((o) => {
                                    return o
                                  })
          */
          relations[o.id] = history()
          relations[o.id].value = o
          let updates = new Array()
          let versions = relations[o.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('relation_history', {id:o.id, history:updates}).save$()
          o.cid = msg.cid
          Seneca.act('role:reason,cmd:addRelation',o,done)
          oo.cid = msg.cid
          oo.save$(done)
          /*
          async () => await senact('role:reason,cmd:addAssociate',
                                   oo).then ((o) => {
                                     return o
                                   })
          */
          associates[oo.id] = history()
          associates[oo.id].value = oo
          updates = new Array()
          versions = associates[oo.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('associate_history', {id:oo.id, history:updates}).save$()
          oo.cid = msg.cid
          Seneca.act('role:reason,cmd:addAssociate',oo,done)
          ooo.save$(done)
          /*
          async () => await senact('role:reason,cmd:addDescriptor',
                                   ooo).then ((o) => {
                                     return o
                                   })
          */
          descriptors[ooo.id] = history()
          descriptors[ooo.id].value = ooo
          updates = new Array()
          versions = descriptors[ooo.id].$$history()
          for (let i = 1; i < versions.length; i++)
            updates.push(diff.detailedDiff(versions[i-1], versions[i]))
          Seneca.make('descriptor_history', {id:ooo.id, history:updates}).save$()
          ooo.cid = msg.cid
          Seneca.act('role:reason,cmd:addDescriptor',ooo,done)

          if (!gauges['push.descriptor.ts'])
            gauges['push.descriptor.ts'] = new client.Gauge({
              name: 'perf_store_descriptor_push_ts',
              help: 'ts when storing a push-descriptor',
              labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
              registers: [registry]
            })

          gauges['push.descriptor.ts'].set({event:'push.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
          //console.dir('s.pd:'+ooo.id)
          done(null,ooo)
        })
      })
    })
  })

  /*
  Seneca.add({role:'store', cmd:'rcvDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    let pid = msg.pid
    let did = msg.did
    let pm = {}
    let pl = []
    let m = {}
    m.pm = pm
    m.prelations = pl
    Seneca.make$('descriptor').load$(pid, (e,o) => {
      descriptors[o.id] = history(o)
      let targets = o.targets
      for (i = 0; i < targets.length; i++) {
        Seneca.make$('associate').load$(targets[i], (e,oo) => {
          associates[oo.id] = history(oo)
          if (oo.id === did) {
            let rl = []
            let relations = oo.relations
            for (ii = 0; ii < relations.length; ii++) {
              Seneca.make$('relation').load$(relations, (e,ooo) => {
                relations[ooo.id] = history(ooo)
                let rm = {}
                rm.id = ooo.id
                rm.aid = oo.id
                rm.type = ooo.type
                rm.sid = oo.sid
                rl.push(rm)
                pl.push(rm)
              })
            }
          }
        })
      }

    if (!gauges['rcv.descriptor.ts'])
      gauges['rcv.descriptor.ts'] = new client.Gauge({
        name: 'perf_store_descriptor_rcv_ts',
        help: 'ts when storing an rcv-descriptor',
          labelNames: ['event','return_code','service','cluster','app','user','ip'],
        registers: [registry]
      })
      gauges['rcv.descriptor.ts'].set({event:'rcv.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address()}, pack(begin_ts, Date.now()))

      done(null, m)
    })
  })
  */

  Seneca.add({role:'store', cmd:'updDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    //let d = msg.descriptor
    let d = msg
    Seneca.make$('descriptor').load$(d.id, (e,o) => {
      if (e == null && o != null) {
        delete o.cid
        o.data$(d).save$()
        let updates = new Array()
        let versions = descriptors[o.id].$$history()
        for (let i = 1; i < versions.length; i++)
          updates.push(diff.detailedDiff(versions[i-1], versions[i]))
        Seneca.make('descriptor_history', {id:o.id, history:updates}).save$()
        o.cid = msg.cid
        Seneca.act('role:reason,cmd:updDescriptor',o,done)
      } else
        o = {}

      if (!gauges['upd.descriptor.ts'])
        gauges['upd.descriptor.ts'] = new client.Gauge({
          name: 'perf_store_descriptor_upd_ts',
          help: 'ts when storing an upd-descriptor',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['upd.descriptor.ts'].set({event:'upd.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.ud:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'drpDescriptor'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('descriptor').remove$({id:msg.id},done)
    delete descriptors[msg.id]
    Seneca.make('descriptor_history').remove$(msg.id,done)
    Seneca.act('role:reason,cmd:drpDescriptor',{id:msg.id,cid:msg.cid},done)

    if (!gauges['drp.descriptor.ts'])
      gauges['drp.descriptor.ts'] = new client.Gauge({
        name: 'perf_store_descriptor_drp_ts',
        help: 'ts when storing an drp-descriptor',
        labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
        registers: [registry]
      })

    gauges['drp.descriptor.ts'].set({event:'drp.descriptor', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
    //console.dir('s.dd:'+msg.id)
  })
  
  Seneca.add({role:'store', cmd:'rsnDescriptor'}, (msg,done) => {
    done(null,[])
  })

  Seneca.add({role:'store', cmd:'updProperties'}, (msg,done) => {

    let begin_ts = Date.now()

    //let p = msg.properties
    let p = msg
    Seneca.make$('descriptor').load$(p.id, (e,o) => {
      o.properties = JSON.parse(p.properties)
      delete o.cid
      o.save$()
      descriptors[o.id].value = o
      let updates = new Array()
      let versions = descriptors[o.id].$$history()
      for (let i = 1; i < versions.length; i++)
        updates.push(diff.detailedDiff(versions[i-1], versions[i]))
      Seneca.make('descriptor_history', {id:o.id, history:updates}).save$()
      o.cid = msg.cid
      Seneca.act('role:reason,cmd:updDescriptor',o,done)

      if (!gauges['upd.properties.ts'])
        gauges['upd.properties.ts'] = new client.Gauge({
          name: 'perf_store_properties_upd_ts',
          help: 'ts when storing an upd-properties',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['upd.properties.ts'].set({event:'upd.properties', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.up:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'addRelation'}, (msg,done) => {

    let begin_ts = Date.now()

    let r = Seneca.make$('relation')
    r.aid = msg.aid
    r.sid = msg.sid
    r.type = msg.type
    r.ts = Date.now()
    r.owner = msg.auth.user
    r.group = 'staff'
    r.perms = 511
    r.save$((e,o) => {
      relations[o.id] = history()
      relations[o.id].value = o
      o.cid = msg.cid
      Seneca.act('role:reason,cmd:addRelation',o,done)
      if (!gauges['add.relation.ts'])
        gauges['add.relation.ts'] = new client.Gauge({
          name: 'perf_store_relation_add_ts',
          help: 'ts when storing an add-relation',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })
      gauges['add.relation.ts'].set({event:'add.relation', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.ar:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'getRelation'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('relation').load$(msg.id, (e,o) => {
      if (o !== null) {
        if (!relations[o.id]) {
          relations[o.id] = history()
          relations[o.id].value = o
        }

        o.cid = msg.cid
        Seneca.act('role:reason,cmd:addRelation',o,done)
      }
      else
        o = {}

      if (!gauges['get.relation.ts'])
        gauges['get.relation.ts'] = new client.Gauge({
          name: 'perf_store_relation_get_ts',
          help: 'ts when storing an get-relation',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
        registers: [registry]
        })

      gauges['get.relation.ts'].set({event:'get.relation', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.gr:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'updRelation'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('relation').load$(msg.id, (e,o) => {
      if ((msg.auth.user == o.owner && o.perms & 128) ||
          (o.group in msg.auth.groups && o.perms & 16) ||
          (o.perms & 2)) {
        o.type = msg.type
        delete o.cid
        o.save$()
        relations[o.id] = history()
        relations[o.id].value = o
      let updates = new Array()
      let versions = relations[o.id].$$history()
      for (let i = 1; i < versions.length; i++)
        updates.push(diff.detailedDiff(versions[i-1], versions[i]))
      Seneca.make('relation_history', {id:o.id, history:updates}).save$()
        o.cid = msg.cid
        Seneca.act('role:reason,cmd:updRelation',o,done)
        //o.save$(done)
      }

      if (!gauges['upd.relation.ts'])
        gauges['upd.relation.ts'] = new client.Gauge({
          name: 'perf_store_relation_upd_ts',
          help: 'ts when storing an upd-relation',
          labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
          registers: [registry]
        })

      gauges['upd.relation.ts'].set({event:'upd.relation', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
      //console.dir('s.up:'+o.id)
      done(null,o)
    })
  })

  Seneca.add({role:'store', cmd:'drpRelation'}, (msg,done) => {

    let begin_ts = Date.now()

    Seneca.make$('relation').remove$(msg.id,done)
    delete relations[msg.id]
    Seneca.make('relation_history').remove$(msg.id,done)
    Seneca.act('role:reason,cmd:drpRelation',{id:msg.id,cid:msg.cid},done)

    if (!gauges['drp.relation.ts'])
      gauges['drp.relation.ts'] = new client.Gauge({
        name: 'perf_store_relation_drp_ts',
        help: 'ts when storing an drp-relation',
        labelNames: ['event','return_code','service','cluster','app','user','ip','cid'],
        registers: [registry]
      })

    gauges['drp.relation.ts'].set({event:'drp.relation', return_code:'200', service:'store', cluster:process.env.cluster, app:process.env.app, user:process.env.user, ip:ip.address(), cid:msg.cid}, pack(begin_ts, Date.now()))
    //console.dir('s.dr:'+msg.id)
  })
}
