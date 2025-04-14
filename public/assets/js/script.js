function g(event) {
    event.preventDefault();

    const input = document.getElementById("url");
    let url = input.value.trim();
    const searchUrl = "https://www.google.com/search?q=";

    if (!url.includes(".")) {
        url = searchUrl + encodeURIComponent(url);
    } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }

    const finalUrl = __uv$config.prefix + __uv$config.encodeUrl(url);
    document.getElementById("MainLoader").src = finalUrl;
}
