/* Copyright (c) 2020 voxgig and other contributors, MIT License */
/* $lab:coverage:off$ */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* $lab:coverage:on$ */
// TODO: options.ents should support zone/base/name canons
const entity_history_doc_1 = __importDefault(require("./entity-history-doc"));
const entity_history_msg_1 = require("./lib/entity_history_msg");
const entity_restore_msg_1 = require("./lib/entity_restore_msg");
const entity_load_msg_1 = require("./lib/entity_load_msg");
const make_cmd_save_history_msg_1 = require("./lib/make_cmd_save_history_msg");
module.exports = entity_history;
module.exports.defaults = {
  ents: [],
  build_who: null,
  wait: false, // wait for history to save before returning
};
module.exports.errors = {};
module.exports.doc = entity_history_doc_1.default;
function entity_history(options) {
  const seneca = this;
  // TODO: this should not be necessary
  // plugin definition delegate should provide plugin options directly
  const cmd_save_history_msg = make_cmd_save_history_msg_1.make_cmd_save_history_msg(options);
  for (let canon of options.ents) {
    let ent_save_pat = {
      ...seneca.util.Jsonic(canon),
      ...{ role: 'entity', cmd: 'save' },
    };
    console.dir('!!'+JSON.stringify(ent_save_pat)+'!!'+JSON.stringify(cmd_save_history_msg))
    //seneca.message(ent_save_pat, cmd_save_history_msg);
  }
  /**/
  seneca
    .fix('sys:entity,rig:history')
    .message('entity:history', entity_history_msg_1.entity_history_msg)
    .message('entity:restore', entity_restore_msg_1.entity_restore_msg)
    .message('entity:load', entity_load_msg_1.entity_load_msg);
  /**/
  return {
    name: 'entity-history',
  };
}
//# sourceMappingURL=entity-history.js.map
