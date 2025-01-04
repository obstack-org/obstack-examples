# ObStack CMS

An example for using ObStack as CMS.

With this example the included ObStack plugin will save the data and images to a separate folder to ensure security and speed. The example is formatted as a Blog.

ObStack CMS is part of the ObStack example set.

# Quick start

To setup a demo with this example, follow these steps:

- **Configure ObStack**
  - Create an object type with the following properties
    - Name: "Creation time", Type: DateTime, Display on Form: Show - Readonly
    - Name: "Title", Type: Text
    - Name: "Content", Type: Textbox
    - Name: "Image", Type: File
- **Setup plugin**
  - Place *plugin_cms.php* in the ObStack ./plugins map
  - Create a directory that is writable for ObStack, and readable for your frontend
- **Configure plugin**
  - In *plugin_cms.php* under Config, set the correct ID's from the newly created object type and its properties, and set the filepath variable to the writable content directory
- **Configure frontend**
  - In *index.js* under Config, set the filepath variable to the content directory

Now create some items and enjoy the show.
