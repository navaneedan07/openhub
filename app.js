const auth = firebase.auth();
const db = firebase.firestore();

function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      alert(error.message);
      console.error(error);
    });
}


function addPost() {
  const text = document.getElementById("postText").value;

  db.collection("posts").add({
    text: text,
    time: new Date()
  });
}

db.collection("posts").orderBy("time", "desc")
.onSnapshot((snapshot) => {
  document.getElementById("posts").innerHTML = "";
  snapshot.forEach(doc => {
    document.getElementById("posts").innerHTML +=
      `<p>${doc.data().text}</p>`;
  });
});

