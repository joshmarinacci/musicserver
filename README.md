

artwork is stored as a separate artwork document in the database.  each thing which uses artwork will have an artwork property
with the ID of the artwork document. this allows albums and songs to share the same artwork.


``` javascript
ex: album: {
    type:'album'
    name:'Abbey Road'',
    artist: someid, // points to The Beatles artist entry
    artwork: someid, // points to the abbey road artwork entry
    
    
}


{
    type:'artwork',
    path:'/some/path/on/disk/filename.jpg',
    format:'image/jpg', // or other mime types
}


```