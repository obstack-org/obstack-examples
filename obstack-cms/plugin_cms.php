<?php

class CMS extends Obstack_Plugin {

    // Config
    public $objecttype   = '1ad934c5-00f8-4bfb-92ae-d2fcfafa6d7b';  // Define object type by id
    private $property_id = [                                        // Object property id's
      'datetime'  => 'e03b5722-894d-4ca7-84da-4d8f34affa38',
      'title'     => 'e0430b99-9761-4c83-86b0-c8e09f0adc56',
      'content'   => 'a576cf68-8044-4ac8-9bb5-14cc9755bc09',
      'image'     => '9356e983-48ed-417b-b91a-8d27c5c7220d'
    ];
    private $filepath   = '../content';                             // Path for storing images and json

    // Construct
    public function __construct()
    {
      // Retain Obstac_Plugin construct content
      parent::__construct();
      // On posted files store them on disk
      if (!empty($_FILES)) {
        global $api;
        if ($api->route('/objecttype/{objecttype}/object/{object}') && $api->param('objecttype') == $this->objecttype) {
          foreach($_FILES as $fid => $file) {
            if ($file['error'] == 0) {
              copy($file['tmp_name'], $this->filepath.'/'.hash('sha256', $api->param('object').'-'.substr($fid,2)));
            }
          }
        }
      }
    }

    // Alter object before saving to database
    public function save($object) {
      // Set DateTime
      if ($object->id == null) {
        $object->{$this->property_id['datetime']} = str_replace(' ', 'T', $this->db_now());
      }
      return $object;
    }

    // Perform action before deleting object from database
    public function delete($object) {
      // Delete file from disk
      foreach(glob($this->filepath.'/'.$object->id.'*') as $file) {
        unlink($file);
      }
    }

    // To ensure content.json is generated with all id's after adding a new object,
    // the plugin list function/event is used to generate the json each time the list
    // is called (post-plugin functions will be added in the future)
    public function list($objects) {
      $sid = 2;
      $export = [];
      foreach($objects as $object) {
        // Suffix on double keys
        $expkey = $object->{$this->property_id['datetime']};
        if (array_key_exists($expkey, $export)) {
          $expkey = $expkey.' _'.$sid;
          $sid++;
        }
        // Reformat for frontend usage
        $export[$expkey] = [
          'id'      => $object->id,
          'title'   => $object->{$this->property_id['title']},
          'content' => $object->{$this->property_id['content']},
          'image'   => hash('sha256', $object->id.'-'.$this->property_id['image'])
        ];
      }
      // Save as json
      krsort($export);
      file_put_contents($this->filepath.'/content.json', json_encode($export));
      // Return objects (untouched)
      return $objects;
    }

    // Read current time from database (private)
    private function db_now() {
      global $db;
      return $db->query("SELECT TO_CHAR(now(), 'YYYY-MM-DD HH24:MI') AS now", [])[0]->now;
    }

  }