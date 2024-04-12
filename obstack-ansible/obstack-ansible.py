#!/usr/bin/env python3
# ============================================================================================================
#  obstack-ansible.py
# --------------------------------------------
#  Example script for running Ansible playbooks initiated by an ObStack object. Setup an ansible environment
#  on a server or docker container, and schedule this script to e.g. check for new jobs every minute.
#  ObStack Ansible is part of the ObStack example set (https://github.com/obstack-org/obstack-examples/)
#
#  Configuration:
#    Setup the obstack host and token in obstack-ansible.cfg
#  Auto-create required object types:
#    ./obstack-ansible.py init
#  Run playbook for new objects in objecttype
#    ./obstack-ansible.py run [objecttype-uuid] [playbook.yml]
#
# ============================================================================================================

import os, sys, shutil, re, io, requests, json, ansible_runner
from configparser import ConfigParser
from contextlib import redirect_stdout
from datetime import datetime
from uuid import UUID

# =============================================================
#  config
# --------------------------------------------
#  Global config
# =============================================================
config = {}

# =============================================================
#  api
# --------------------------------------------
#  Process API calls
#    method    HTTP method (get/put/post/delete)
#    path      URI path
#    data      Payload for put/post
# =============================================================
def api(method, path, data=None):
  rsp = None
  pth = f"{config['host']}/api.php/v2/{path}"
  tkn = config['token']
  if method == 'get':
    rsp = requests.get(pth, headers={'X-API-Key':tkn})
  elif method == 'put':
    rsp = requests.put(pth, data=json.dumps(data), headers={'X-API-Key':tkn})
  elif method == 'post':
    rsp = requests.post(pth, data=json.dumps(data), headers={'X-API-Key':tkn})
  elif method == 'delete':
    rsp = requests.delete(pth, headers={'X-API-Key':tkn})
  else:
    print(f"Invalid request method '{method}', exiting...")
    exit(1)
  if (rsp.status_code == 200):
    return rsp.json()
  else:
    return { 'http_error': rsp.status_code }

# =============================================================
#  initcfg
# --------------------------------------------
#  Read config from file obstack-ansible.cfg
# =============================================================
def initcfg():
  ctx = 'obstack'
  cpr = ConfigParser()
  cpr.read(f'{os.path.dirname(__file__)}/obstack-ansible.cfg')
  for key in ['host', 'token', 'prefix' ]:
    if cpr.has_option(ctx, key):
      config[key] = cpr.get(ctx, key)
    else:
      print(f'Error parsing config. Required: {key}')
      exit(1)
  try:
    rsp = api('get', 'auth')
  except:
    print('Error connecting to ObStack')
    exit(1)
  if 'http_error' in rsp:
    print('Error authenticating to ObStack')
    exit(1)

# =============================================================
#  checkot
# --------------------------------------------
#  Check if object type exists, and has the required fields
# =============================================================
def checkot(objecttype):
  rsp = None
  try:
    UUID(objecttype)
    rsp = api('get', f'objecttype/{objecttype}/property')
    if 'http_error' in rsp:
      raise Exception()
  except:
    print('Error, please configure a valid object type UUID')
    exit(1)
  # Check for required fields
  plst = { 'var':{}, 'req':{} }
  for prp in rsp:
    plst['var'][prp['name']] = prp['id']
  for prp in ['Pickup', 'Inventory', 'Status', 'Output']:
    if prp in plst['var']:
      plst['req'][prp] = plst['var'][prp]
      del(plst['var'][prp])
    else:
      print('Error, required fields: Pickup, Status, Output')
      exit(1)
  # Return UUID's of dynamically created fields
  return plst

# =============================================================
#  createot
# --------------------------------------------
#  Create example object types
#    name       Name suffix
# =============================================================
def createot(name):
  othosts = None
  otinven = None
  obinven = None
  for ot in api('get', 'objecttype'):
    if ot['name'] == f"{config['prefix']}-Hosts":
      othosts = ot['id']
    if ot['name'] == f"{config['prefix']}-Inventory":
      otinven = ot['id']
  # Create Ansible Example Inventory
  if otinven == None:
    data = {
      "name":f"{config['prefix']}-Inventory", "short":"1", "map":None, "log":"1",
      "property":[
        {"name":"Inventory Name","type":"1","id":None,"required":True,"type_objtype":None,"type_valuemap":None,"tbl_visible":True,"tbl_orderable":True,"frm_visible":True,"frm_readonly":False}
      ],
      "relations":[]
    }
    otinven = api('post', 'objecttype', data)['id']
    prinven = api('get', f'objecttype/{otinven}/property')[0]['id']
    obinven = api('post', f'objecttype/{otinven}/object', { prinven:"My First Inventory", "relations":[] })['id']
  # Create Ansible Example Hosts
  if othosts == None:
    data = {
      "name":f"{config['prefix']}-Hosts", "short":"1", "map":None, "log":"1",
      "property":[
        {"name":"Hostname","type":"1","id":None,"required":True,"type_objtype":None,"type_valuemap":None,"tbl_visible":True,"tbl_orderable":True,"frm_visible":True,"frm_readonly":False}
      ],
      "relations":[otinven]
    }
    othosts = api('post', 'objecttype', data)['id']
    prhosts = api('get', f'objecttype/{othosts}/property')[0]['id']
    api('post', f'objecttype/{othosts}/object', { prhosts:"myhost1.example.local", "relations":[obinven] })
    api('post', f'objecttype/{othosts}/object', { prhosts:"myhost2.example.local", "relations":[obinven] })
  # Create Ansible Example JobQueue
  data = {
    "name":f"{config['prefix']}-{name}", "short":"3", "map":None, "log":"1",
    "property":[
      {"name":"Pickup", "type":"9", "id":None, "required":False, "type_objtype":None, "type_valuemap":None, "tbl_visible":True, "tbl_orderable":True, "frm_visible":True, "frm_readonly":True},
      {"name":"Inventory", "type":"3", "id":None, "required":False, "type_objtype":otinven, "type_valuemap":None, "tbl_visible":True, "tbl_orderable":False, "frm_visible":True, "frm_readonly":False},
      {"name":"Status", "type":"1", "id":None, "required":True, "type_objtype":None, "type_valuemap":None, "tbl_visible":True, "tbl_orderable":True, "frm_visible":True, "frm_readonly":True},
      {"name":"Output", "type":"6", "id":None, "required":False, "type_objtype":None, "type_valuemap":None, "tbl_visible":False, "tbl_orderable":False, "frm_visible":True, "frm_readonly":True}
    ],
    "relations":[]
  }
  rsp = api('post', 'objecttype', data)
  print(f"Created objecttype, UUID: {rsp['id']}\nFurther configuration can be done in the ObStack WebUI")

# =============================================================
#  help
# =============================================================
def help():
  bnm = os.path.basename(__file__)
  print(f'Usage:\n  ./{bnm} help\n  ./{bnm} init [objecttype-name]\n  ./{bnm} run [objecttype-uuid] [playbook]')
  exit(0)

# =============================================================
#  pickup
# --------------------------------------------
#  Get and process new job objects
#    objecttype    Job objects
#    property      List of property id's (createot result)
#    playbook      Playbook YML file
# =============================================================
def pickup(objecttype, property, playbook):
  # Get inventory object type
  invid = None
  otp = api('get', f'objecttype/{objecttype}/property')
  for prp in otp:
    if prp['id'] == property['req']['Inventory']:
      invid = prp['type_objtype']
  rex = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
  # Process new objects
  for itm in api('get', f'objecttype/{objecttype}/object'):
    if itm[property['req']['Pickup']] == None:
      stats = None
      output = None
      # Get hosts from inventory
      hosts = { 'all':{ 'hosts':{} } }
      inv = api('get', f"objecttype/{invid}/object/{itm[property['req']['Inventory']]}/relation")
      for host in inv:
        hnm = None
        for pky,pvl in host.items():
          if hnm == None and pky != 'id':
            hnm = pvl
        hosts['all']['hosts'][hnm] = { 'ansible_host': hnm }
      # Get ExtraVars
      for var in property['var']:
        property['var'][var] = itm[property['var'][var]]
      # Run playbook
      with io.StringIO() as buf, redirect_stdout(buf):
        r = ansible_runner.run(private_data_dir='./', extravars=property['var'], playbook=playbook, inventory=hosts)
        status = r.status
        output = buf.getvalue()
      # Return output
      data = {
        property['req']['Pickup']: datetime.now().strftime('%Y-%m-%dT%H:%M'),
        property['req']['Status']: status,
        property['req']['Output']: rex.sub('', output)
      }
      api('put', f"objecttype/{objecttype}/object/{itm['id']}", data)
  # Cleanup
  shutil.rmtree('./env', ignore_errors=True)
  shutil.rmtree('./inventory', ignore_errors=True)
  shutil.rmtree('./artifacts', ignore_errors=True)

# ===========================================================
#  Main
# ===========================================================
def main():
  if len(sys.argv) <= 1:
    help()
  elif sys.argv[1] == 'init' and len(sys.argv) == 3:
    initcfg()
    createot(sys.argv[2])
  elif sys.argv[1] == 'run' and len(sys.argv) == 4:
    initcfg()
    plst = checkot(sys.argv[2])
    pickup(sys.argv[2], plst, sys.argv[3])
  else:
    help()

# === Main ===
if __name__ == '__main__':
  main()
