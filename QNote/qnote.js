
/*******************************************************************
 *  Configuration
 ******************************************************************/

// Definition for required fields in ObStack
// (used by: ObStack_OTListByName(), ObStack_OTListCheck() )
let otlist = {
  qnote: {
    id: null,
    name: 'QNote',
    property: {
      title:    { id: null, name: 'Title' },
      body:     { id: null, name: 'Body' },
      created:  { id: null, name: 'Created' },
      updated:  { id: null, name: 'Updated' },
    }
  },
  qhist: {
    id: null,
    name: 'QNote History',
    property: {
      qnote:    { id: null, name: 'QNote' },
      datetime: { id: null, name: 'DateTime' },
      body:     { id: null, name: 'Body' },
    }
  }
}

// Configuration check vars
let configstate = false;
let nbuff = { id: null, body: null };

// User Interface
let cf = { 
  apibase: $('<input/>'), 
  apikey:  $('<input/>'), 
}
let ui = {
  titlebar: $('<div/>', { class:'titlebar' }),
  sidebar: $('<div/>', { class:'sidebar' }),
  content: $('<div/>', { class:'content' }),
  textbox: $('<textarea/>', { class:'nttext', spellcheck:false, readonly:true }),
  btnsave: $('<div/>', { class:'mnbtn mnbtn-disable' }).html('&#x1F5AB;'),
  btnconf: $('<div/>', { class:'mnbtn' }).html('&#x2699;&nbsp;'),
  config:  $('<div/>', { class:'config' }).append(
    $('<table/>').append(
      $('<tr/>').append($('<td/>').html('&nbsp;API Base&nbsp;'), $('<td/>').append(cf.apibase)),
      $('<tr/>').append($('<td/>').html('&nbsp;API Key&nbsp;' ), $('<td/>').append(cf.apikey)),
      $('<tr/>').append($('<td/>').html('' ), $('<td/>', { style:'text-align:right;' }).append(
        $('<input/>', { type:'button', style:'width:80px;cursor:pointer;' })
        .on('click', function() { QNote_SaveConfig(); })
        .val('Ok')
      )),
    )
  )
}

/*******************************************************************
 *  Document loading
 ******************************************************************/

// Load app
$(document).ready( function () {
  // Load config
  let config = JSON.parse(localStorage.getItem('qnote:config'));
  if (config != null) {
    if ('apikey' in config) { cf.apikey.val(config.apikey); }
    if ('apibase' in config) { cf.apibase.val(config.apibase); }
  }
  if (cf.apibase.val().length <= 0) { cf.apibase.val('../obstack/api.php'); }
  // Build UI
  $('body').append(
    ui.titlebar.append(
      'QNote ', 
      $('<div/>', { class:'glink' }).append(
        $('<a/>', { href:'https://github.com/obstack-org/obstack-examples/tree/main/webapp', target:'_blank', class:'glink' }).html('&#x1F517;')
      ),      
      ui.btnconf,
      ui.btnsave,
    ), 
    ui.sidebar,
    ui.content.append(
      ui.textbox
    ),
    ui.config
  );
  // Assign events
  ui.textbox.on('change keyup mouseup input cut paste', function() { QNote_TextboxChange(); });
  ui.btnconf.on('click', function() { ui.config.show(); });
  ui.btnsave.on('click', function() { QNote_SaveNote(); });
  // Load data
  $.when(
    api('get',`auth`)
  )
  .done(function() {
    ObStack_OTListByName();
    setTimeout(function(){
      ObStack_OTListCheck();
      if (configstate) {
        QNote_LoadSidebar();
      }
    }, 500);
  })
  .fail(function(e) {
    alert(`Error authentication to API (${e.status})`);
  }); 
});

// Alert on unsaved changes when closing page
$(window).bind('beforeunload',function(){
  if (nbuff.body != null && $(ui.textbox).val() != nbuff.body) {
    return 'You have unsaved changes, do you want to continue?';
  }
});

// global default onclick
$(document).on('click', function(event) {
  let hide = true;
  if ($(event.target).parent().closest('div').length == 0) {
    if (event.target.className  == 'config') {
      hide = false;
    }
  }
  else {
    if ($(event.target).parent().closest('div')[0].className == 'config' || event.target.className  == 'mnbtn') {
      hide = false;
    }
  }
  if (hide) {
    ui.config.hide();
  }
});

// Save by Ctrl+S
$(document).bind("keydown", function(event) {
  if(event.which == 83 && event.ctrlKey){
      QNote_SaveNote();
      event.preventDefault();
      return false;  
  }
});

/*******************************************************************
 *  General functions
 ******************************************************************/

// API call for ObStack with Token
function api(httpmethod, path, data) {
  let xhr = $.ajax({
    url: `${cf.apibase.val()}/v2/${path}`,
    type: httpmethod,
    headers: { 'X-API-Key': cf.apikey.val() },
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(data),
    error: function (response) {
      console.log({status:response.status, request:`${httpmethod}: ${path}`, data:data});
      console.log(`Error ${response.status} on API connection`) 
    }
  });
  return xhr;
}

// Sort list
function lssort(list) {
  return list.sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase());});
}

// Custom alert popup
function alert(msg, delay=8000, fade=1000) {
  let alertbox = $('<div/>', { class:'alert' });
  alertbox.append(msg);
  $('body').append(alertbox);
  setTimeout(function() { 
    alertbox.fadeOut(fade); 
    setTimeout(function() { 
      alertbox.remove(); 
    }, fade);
  }, delay);
}

/*******************************************************************
 *  QNote / ObStack functions
 ******************************************************************/

// Get active ID's from ObStack, query by name as configured in otlist
function ObStack_OTListByName() {
  $.when(
    api('get',`objecttype`)
  )
  .done(function(objecttypes) {
    $.each(objecttypes, function(dmy, ob_ot) {
      $.each(otlist, function(lc_ot_key, lc_ot) {
        if (lc_ot.name == ob_ot.name) {
          lc_ot.id = ob_ot.id
          $.when(
            api('get',`objecttype/${lc_ot.id}/property`)
          )
          .done(function(properties) {
            $.each(properties, function(ob_prop_key, ob_prop) {
              $.each(otlist[lc_ot_key].property, function(lc_prop_key, lc_prop) {
                if (lc_prop.name == ob_prop.name) {
                  otlist[lc_ot_key].property[lc_prop_key].id = ob_prop.id;
                }
              });   
            });        
          })
          .fail(function() {
            alert('Error reading ObStack ObjectType Properties');        
          });
        }
      });   
    });
  })
  .fail(function() {
    alert('Error reading ObStack Object Types');
  });
}

// Check otlist if all ID's are loaded
function ObStack_OTListCheck() {
  let state = true;
  $.each(otlist, function(ot_key, ot) {
    if (ot.id == null) {
      state = false;
      console.log(`Missing ObjectType ID or access: '${ot.name}'`);
    }
    else {
      $.each(otlist[ot_key].properties, function(prop_key, prop) {
        if (prop.id == null) {
          state = false;
          console.log(`Missing Property ID: ${ot.name} / ${prop_key}`);
        }
      });
    }
  });
  if (state) {
    configstate = true;
  }
  else {
    alert('Missing ID\'s, check console log for details');
    console.log('For more details on the requirements please read the README')
  }  
}

// Populate sidebar
function QNote_LoadSidebar() {  
  $.when(
    api('get',`objecttype\\${otlist.qnote.id}\\object`)
  )
  .done(function(notes) {
    let lnlist = [];
    $.each(notes, function(dmy, note) {
      lnlist = [...lnlist, `${note[otlist.qnote.property.title.id]}|${note.id}`];
    });
    $.each(lssort(lnlist), function(dmy, note) {
      let split = note.lastIndexOf('|')
      note = {
        id: note.substring(split+1),
        title: note.substring(0,split)
      };
      ui.sidebar.append(
        $('<div/>', { class:'sidebar-item' })
          .append(note.title)
          .on('click', function() {
            $(ui.sidebar).find('div').each(function() { $(this).css('background',''); });
            $(this).css('background','#d9ebfc')
            QNote_OpenNote(note.id);
          })
      )
    });        
  });
}

// Save config (OK button in config popup)
function QNote_SaveConfig() {
  localStorage.setItem('qnote:config', JSON.stringify({ apibase:cf.apibase.val(), apikey:cf.apikey.val() }));
  location.reload(true);
}

// Save button state on textarea change
function QNote_TextboxChange() {
  if ($(ui.textbox).val() != nbuff.body) {
    ui.btnsave.removeClass('mnbtn-disable');
  }
  else {
    ui.btnsave.addClass('mnbtn-disable');
  }
}

// Open a Note
function QNote_OpenNote(id) {
  let load = true;
  if (nbuff.body != null && $(ui.textbox).val() != nbuff.body) {
    load = confirm('You have unsaved changes, do you want to continue?');
  }
  if (load) {
    $.when(
      api('get',`objecttype/${otlist.qnote.id}/object/${id}`)
    )
    .done(function(note) {
      nbuff.id = id;
      nbuff.body = note[otlist.qnote.property.body.id];
      ui.textbox.val(note[otlist.qnote.property.body.id]);
      ui.textbox.attr("readonly", false);
      ui.btnsave.addClass('mnbtn-disable');
    })
    .fail(function() {
      alert('Error reading Note');        
    });
    setTimeout(function() {
      api('delete','/auth');
    },500);
  }
}

// Save button, update record and add history item
function QNote_SaveNote() {
  if ($(ui.textbox).val() != nbuff.body) {
    let tzoffset = (new Date()).getTimezoneOffset() * 60000;
    let dtnow = (new Date(Date.now() - tzoffset)).toISOString();
    let data = {
      [otlist.qnote.property.body.id]: $(ui.textbox).val(),
      [otlist.qnote.property.updated.id]: dtnow.substring(0,dtnow.lastIndexOf('.')),      
    }
    $.when(
      api('put',`objecttype/${otlist.qnote.id}/object/${nbuff.id}`, data)
    )
    .done(function() {
      nbuff.body = $(ui.textbox).val();
      ui.btnsave.addClass('mnbtn-disable');      
      let data = {
        [otlist.qhist.property.qnote.id]: nbuff.id,
        [otlist.qhist.property.datetime.id]: dtnow.substring(0,dtnow.lastIndexOf('.')),
        [otlist.qhist.property.body.id]: nbuff.body,
      }
      $.when(
        api('post',`objecttype/${otlist.qhist.id}/object`, data)
      )
      .fail(function() {
        alert('Error saving history');        
      });
    })
    .fail(function() {
      alert('Error saving note');        
    });
    setTimeout(function() {
      api('delete','/auth');
    },500);
  }  
}
