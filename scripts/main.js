(function() {
  String.prototype.toBoolean = function() {
    return this.toLowerCase().trim() === 'true';
  }
  
  const States = Enum({ Add: "add", Edit: "edit", Preset: "preset", Show: "show", Hide: "hide"});
  const Directions = Enum({ Horizontal: "horizontal", Vertical : "vertical" });
  const Alignments = Enum({ Start: "start", Center: "center", End: "end" });
  const Styles = Enum({ Blur: 2, Shadow: 4, Bordered: 8, Rounded: 16, Rotated: 32});
  
  class Tile {
    constructor(id, title, location, color, size, position = 0, description = "", style = 0) {
      this.id = id;
      this.title = title;
      this.location = location;
      this.color = color;
      this.size = size;
      this.position = position;
      this.description = description;
      this.style = style;
    }
    //get id() { return this.id; }
  }
  
  class Size {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
  }
  
  class Settings {
    constructor() {
      this.gridCols = 0;
      this.gridGap = 20;
      this.gridAlignH = 1;
      this.gridAlignV = 1;
      this.cellSize = 100;
      this.tilesStyle = 22;
      this.tilesOpacity = 255;
      this.accentColor1 = "#04AA6D";
      this.accentColor2 = "#1E434C";
      this.nightMode = false;
      this.dailyImage = false;
      this.bgImage = "";
    }
  }
  
  const db = new Dexie("TilesDB");
  db.version(1).stores({
    tiles: "id, title, location, description", 
    settings: "++id"
  });
  
  const sidebar = document.getElementById('sidebar');
  const tilebar = document.getElementById('tilebar');
  const tiles = document.getElementById('tiles');
  const btnAdd = document.getElementById('btn-add');
  const btnMenu = document.getElementById('btn-menu');
  const btnEdit = document.getElementById('btn-edit').querySelector('input');
  
  btnMenu.addEventListener('click', () => toggleSidebar());
  document.addEventListener('keyup', event => {
    if (event.code === 'Escape')
      toggleSidebar();
  });
  
  btnAdd.addEventListener('click', () => {
    changeTile(newTile());
    tilebar.dataset.action = States.Add;
    tilebar.querySelector("#tilebar-header .title").textContent = "Add Tile";
  });
  
  btnEdit.addEventListener('input', (e) => allowChanges(e.target.checked));
  
  const settings = new Settings();
  loadSettings(settings);
  getTiles();
  
  async function loadSettings(settings) {
    let arrSettings = await db.settings.toArray();
    try {
      let arrSettings = await db.settings.toArray();
      if (arrSettings.length > 0 && arrSettings[0])
        Object.assign(settings, arrSettings[0]); 
      else
        saveSettings(settings);
      console.log("Настройки успешно загружены:", settings);
    } 
    catch (error) {
      console.error("Ошибка при загрузке настроек: ", error);
    }

    updateInput(sidebar.querySelector("#grid-cols"), settings.gridCols);
    changeColumns(settings.gridCols);
    updateInput(sidebar.querySelector("#grid-gap"), settings.gridGap);
    changeGap(settings.gridGap)
    updateInput(sidebar.querySelector("#grid-align-h"), settings.gridAlignH);
    changeAlignment(settings.gridAlignH, Directions.Horizontal);
    updateInput(sidebar.querySelector("#grid-align-v"), settings.gridAlignV);
    changeAlignment(settings.gridAlignV, Directions.Vertical);
    updateInput(sidebar.querySelector("#cell-size"), settings.cellSize);
    changeSize(settings.cellSize);
    updateInput(sidebar.querySelector("#tiles-opacity"), settings.tilesOpacity);

    sidebar.querySelector("#tiles-rounded").checked = ((settings.tilesStyle & Styles.Rounded) == Styles.Rounded);
    sidebar.querySelector("#tiles-bordered").checked = ((settings.tilesStyle & Styles.Bordered) == Styles.Bordered);
    sidebar.querySelector("#tiles-rotated").checked = ((settings.tilesStyle & Styles.Rotated) == Styles.Rotated);
    sidebar.querySelector("#tiles-shadow").checked = ((settings.tilesStyle & Styles.Shadow) == Styles.Shadow);
    sidebar.querySelector("#tiles-blur").checked = ((settings.tilesStyle & Styles.Blur) == Styles.Blur); 
    
    updateInput(sidebar.querySelector("#accent-color1"), settings.accentColor1);
    updateInput(sidebar.querySelector("#accent-color2"), settings.accentColor2);
    
    sidebar.querySelector("#night-mode").checked = settings.nightMode;
    document.body.dataset.nightMode = settings.nightMode;
    sidebar.querySelector("#daily-image").checked = settings.dailyImage;
    document.body.dataset.dailyImage = settings.dailyImage;

    document.body.style.backgroundImage = `url("${settings.bgImage}")`;
  }
  
  async function saveSettings(settings) {  
    if (settings) {
      settings.gridCols = +sidebar.querySelector("#grid-cols").value;
      settings.gridGap = +sidebar.querySelector("#grid-gap").value;
      settings.gridAlignH = +sidebar.querySelector("#grid-align-h").value;
      settings.gridAlignV = +sidebar.querySelector("#grid-align-v").value;
      settings.cellSize = +sidebar.querySelector("#cell-size").value;
      settings.tilesOpacity = +sidebar.querySelector("#tiles-opacity").value;
      settings.tilesStyle  = sidebar.querySelector("#tiles-rounded").checked ? settings.tilesStyle |= Styles.Rounded : settings.tilesStyle &= ~Styles.Rounded;
      settings.tilesStyle  = sidebar.querySelector("#tiles-bordered").checked ? settings.tilesStyle |= Styles.Bordered : settings.tilesStyle &= ~Styles.Bordered;
      settings.tilesStyle  = sidebar.querySelector("#tiles-rotated").checked ? settings.tilesStyle |= Styles.Rotated : settings.tilesStyle &= ~Styles.Rotated;
      settings.tilesStyle  = sidebar.querySelector("#tiles-shadow").checked ? settings.tilesStyle |= Styles.Shadow : settings.tilesStyle &= ~Styles.Shadow;
      settings.tilesStyle  = sidebar.querySelector("#tiles-blur").checked ? settings.tilesStyle |= Styles.Blur : settings.tilesStyle &= ~Styles.Blur;
      settings.accentColor1 = sidebar.querySelector("#accent-color1").value;
      settings.accentColor2 = sidebar.querySelector("#accent-color2").value;
      settings.nightMode = document.body.dataset.nightMode.toBoolean();
      settings.dailyImage = document.body.dataset.dailyImage.toBoolean();
      saveImage();
  
      try {
        db.settings.clear();
        await db.settings.put(settings);
        console.log("Настройки успешно сохранены: ", settings);
      } 
      catch (error) {
        console.error("Ошибка при сохранении настроек: ", error);
      }
    }
  }
  
  function allowChanges(isAllow) {
    const divTiles = tiles.querySelectorAll(".tile");
    divTiles.forEach((tile) => tile.draggable = isAllow);
    const arrTiles = parseTiles();
    if(isAllow) {
      tiles.dataset.action = States.Edit;
      
      //localStorage.setItem('tiles', JSON.stringify(arrTiles));
      
      tiles.addEventListener('mousedown', onMouseDown, false);
      tiles.addEventListener('mouseup', onMouseUp, false);
      tiles.addEventListener('dragstart', onDragStart, false);
      tiles.addEventListener('dragend', onDragEnd, false);
    }
    else {
      tiles.dataset.action = States.Show;
      saveTiles(arrTiles);
  
      /*const newTiles = JSON.parse(localStorage.getItem('tiles'));
      const idsOld = arrTiles.map(tile => tile.id);
      const idsNew = newTiles.map(tile => tile.id);
      const isChanged = idsOld.length !== idsNew.length || (idsOld.length === idsNew.length && idsOld.some((id, index) => id !== idsNew[index]));
      */
      /*const uniqueIds = [
        ...idsOld.filter(id => !idsNew.includes(id)),
        ...idsNew.filter(id => !idsOld.includes(id)) 
      ];*/
  
      tiles.removeEventListener('mousedown', onMouseDown, false);
      tiles.removeEventListener('mouseup', onMouseUp, false);
      tiles.removeEventListener('dragstart', onDragStart, false);
      tiles.removeEventListener('dragend', onDragEnd, false);
    }
  }
  
  function changeTheme(isDynamic) {
    document.body.dataset.dynamicMode = isDynamic;
    var elem = document.getElementById("night-mode");
    if(isDynamic) {
      var d = new Date(), hour = d.getHours();
      if (hour >= 9 && hour < 21 ) {
        elem.checked = false;
        document.body.dataset.nightMode = false;
      }
      else {
        elem.checked = true;
        document.body.dataset.nightMode = true;
      }
    }
  }
  
  function changeAlignment(val, direction) {
    const alignments = [Alignments.Start, Alignments.Center, Alignments.End];
    if (direction === Directions.Horizontal)
      tiles.style.justifyContent = alignments[val] || Alignments.Center;
    else if (direction === Directions.Vertical)
      tiles.style.alignContent = alignments[val] || Alignments.Center;
  }
  
  function changeColumns(val) {
    let cols = val > 0 ? val : 'auto-fit';
    tiles.style.gridTemplateColumns = `repeat(${cols}, ${settings.cellSize}px)`;
  }
  
  function changeGap(val) {
    tiles.style.gridGap = `${val}px`;
  }
  
  function changeSize(val) {
    let cols = settings.gridCols > 0 ? settings.gridCols : 'auto-fit';
    tiles.style.gridTemplateRows = `repeat(auto-fit, ${val}px)`;
    tiles.style.gridTemplateColumns = `repeat(${cols}, ${val}px)`;
    tiles.style.gridAutoRows = `${val}px`;
    tiles.style.gridAutoColumns = `${val}px`;
    let arrTiles = document.querySelectorAll('.tile');
    arrTiles.forEach((tile) => {
      tile.style.minWidth =  `${val}px`;
      tile.style.minHeight = `${val}px`;
    });
  }
  
  function changeOpacity(val) {
    let alphaHex = Number(val).toString(16);
    if (alphaHex.length == 1)
      alphaHex = alphaHex.padStart(2, '0');
    let arrTiles = tiles.querySelectorAll(".tile:not([data-preset])");
    arrTiles.forEach((tile) => {
      let color = new Color(tile.dataset.color);
      let newColor = new Color(color.toHEXString() + alphaHex);
      tile.querySelector(".flipper").style.backgroundColor = newColor.toHEXAString();
      tile.dataset.color = newColor.toHEXAString();
    });
  }
  
  function changeStyle(elem) {
    let style = elem.id.split("-")[1];
    let prop = style.charAt(0).toUpperCase() + style.slice(1);
    settings.tilesStyle = elem.checked ? settings.tilesStyle |= Styles[prop] : settings.tilesStyle &= ~Styles[prop];
    let arrTiles = tiles.querySelectorAll(".tile:not([data-preset])");
    arrTiles.forEach((tile) => {
      if(elem.checked) {
        if((tile.dataset.style & Styles[prop]) != Styles[prop])
          tile.dataset.style |= Styles[prop];
        tile.children[0].classList.add(style);
      }
      else {
        if((tile.dataset.style & Styles[prop]) == Styles[prop])
          tile.dataset.style &= ~Styles[prop];
        tile.children[0].classList.remove(style);
      }
    });
  }
  
  function newTile() {
    let tile = new Tile(`t${guid()}`);
    tile.position = Array.prototype.slice.call(tiles.children).indexOf(btnAdd);
    tile.title = "";
    tile.location = "";
    tile.description = "";
    tile.size = new Size(1, 1);
    let alphaHex = settings.tilesOpacity.toString(16);
    if (alphaHex.length == 1)
      alphaHex = alphaHex.padStart(2, '0');
    let hexColor1 = settings.accentColor1;
    let hexColor2 = settings.accentColor1;
    let color = new Color(hexColor1 + alphaHex);
    if (hexColor1 != hexColor2) {
      let color2 = new Color(hexColor2);
      color.interpolation(color.toRGBArray(), color2.toRGBArray());
    }
    tile.color = color.toHEXAString();
    tile.style = settings.tilesStyle;
    return tile;
  }
  
  function addTile(tile) { 
    let divTile = document.createElement("div");
    divTile.id = tile.id;
    divTile.classList.add("tile", "flip-container");
    divTile.dataset.color = tile.color;
    divTile.dataset.colSpan = tile.size.width;
    divTile.dataset.rowSpan = tile.size.height;
    
    let strFront = tile.location ? `
      <input name="location" value="${tile.location}" type="hidden" />
      <a href="${tile.location}" class="front" draggable="false">
        <div class="logo"><img src="${getFavicon(tile.location)}" alt="site icon" draggable="false"></div>
        <span>${tile.title}</span>
      </a>` : `<div class="front"><span>${tile.title}</span></div>`;
    let strBack = tile.description ? `<div class="back"><span>${tile.description}</span></div>` : "";
    
    divTile.innerHTML = `
      <div class="flipper" style="background-color: ${tile.color};">
        ${strFront}
        ${strBack}
        <div class="actions">
          <button name="btn-edit" class="btn btn-sm" type="button"><i class="fa-solid fa-gear"></i></button>
          <button name="btn-remove" class="btn btn-sm" type="button"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    `;
  
    applyStyle(divTile, States.Add);
  
    divTile.style.gridArea = `span ${tile.size.height} / span ${tile.size.width}`;
    divTile.draggable = tiles.dataset.action == States.Edit;
    let index = Array.prototype.slice.call(tiles.children).indexOf(btnAdd);
    if(tile.position < tiles.children.length && tile.position < index)
      tiles.insertBefore(divTile, tiles.children[tile.position]);
    else
      tiles.insertBefore(divTile, btnAdd);
  }
  
  function changeTile(tile) { 
    tilebar.querySelector("#tile-id").value = tile.id;
    tilebar.querySelector("#tile-position").value = tile.position;
    tilebar.querySelector("#tile-title").value = tile.title;
    tilebar.querySelector("#tile-location").value = tile.location;
    tilebar.querySelector("#tile-description").value = tile.description;
    tilebar.querySelector("#tile-width").value = tile.size.width;
    tilebar.querySelector("#tile-height").value = tile.size.height;
    let color = new Color(tile.color);
    tilebar.querySelector("#tile-color").value = color.toHEXString();
    tilebar.querySelector("#tile-opacity").value = color.toRGBAArray()[3];
    for (const prop in Styles) {
      if (Styles.hasOwnProperty(prop))
        tilebar.querySelector(`#tile-${prop.toLowerCase()}`).checked = ((tile.style & Styles[prop]) == Styles[prop]);
    }
  }
  
  function removeTile(id) {
    const elem = tiles.querySelector(`#${id}`);
    elem && tiles.removeChild(elem);
  }
  
  let dragEl, nextEl;
  function onMouseDown(e) {
    dragEl = e.target.closest('.tile');
    if (dragEl && tiles.contains(dragEl))
      dragEl.classList.add('custom-drag-ghost');
  }
  
  function onMouseUp(e) {
    dragEl = e.target.closest('.tile');
    if (dragEl && tiles.contains(dragEl)) {
      let rowSpan = Math.round(dragEl.clientHeight / settings.cellSize);
      let colSpan = Math.round(dragEl.clientWidth / settings.cellSize);
      dragEl.style.gridArea = `span ${rowSpan} / span ${colSpan}`;
      dragEl.dataset.rowSpan = rowSpan;
      dragEl.dataset.colSpan = colSpan;
      dragEl.style.width = "";
      dragEl.style.height = "";
      dragEl.classList.remove('custom-drag-ghost');
    }
  }
  
  function onDragStart(e) {
    dragEl = e.target.closest('.tile');
    if (dragEl && tiles.contains(dragEl)) {
      nextEl = dragEl.nextElementSibling;
      let oldPos = Array.from(tiles.children).map(tile => document.getElementById(tile.id).getBoundingClientRect());
  
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragEl);
      dragEl.classList.add('ghost');
  
      tiles.addEventListener('dragover', onDragOver, false);
    }
  }
  
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    let target = e.target.closest('.tile');
    if(target && target !== dragEl && tiles.contains(target)) {
      if(target.classList.contains('content')) {
        e.stopPropagation();
      } 
      else {
        let targetPos = target.getBoundingClientRect();
        let next = (e.clientY - targetPos.top) / (targetPos.bottom - targetPos.top) > .5 || (e.clientX - targetPos.left) / (targetPos.right - targetPos.left) > .5;    
        tiles.insertBefore(dragEl, next && target.nextElementSibling || target);
      }
    }
  }
  
  function onDragEnd(e) {
    e.preventDefault();
    let newPos = Array.from(tiles.children).map(tile => document.getElementById(tile.id).getBoundingClientRect());
    dragEl.classList.remove('ghost');
    nextEl !== dragEl.nextElementSibling ? onUpdate(dragEl) : false;
  
    tiles.removeEventListener('dragover', onDragOver, false);
  }
  
  tiles.addEventListener('click', (e) => {
    let elem = e.target;
    let tile = elem.closest('.tile');
    switch(elem.name) {
      case 'btn-edit':
        changeTile(parseTile(tile));
        tilebar.dataset.action = States.Edit;
        tilebar.querySelector("#tilebar-header .title").textContent = "Edit Tile";
        break;
      case 'btn-remove':
        removeTile(tile.id);
        break;
      default:
        break;
      }
  });
  
  tilebar.addEventListener('click', (e) => {
    let elem = e.target;
    switch(elem.name) {
      case 'btn-back':
        toggleTilebar();
        break;
      case 'btn-save':
        let tile = parseTileFromTilebar();
        if(tilebar.dataset.action == States.Edit)
          removeTile(tile.id);
        addTile(tile);
        toggleTilebar();
        break;
      case 'btn-random-color':
        let color = new Color();
        tilebar.querySelector("#tile-color").setAttribute("value", color.toHEXString())
        tilebar.querySelector("#tile-color").value = color.toHEXString();
        break;
      default:
        break;
    }
  });
  
  sidebar.addEventListener('click', (e) => {
    let elem = e.target;
    switch(elem.name) {
      case 'btn-back':
        toggleSidebar();
        break;
      case 'btn-export':
        exportTiles();
        toggleSidebar();
        break;
      case 'btn-save':
        saveSettings(settings);
        saveTiles(parseTiles());
        toggleSidebar();
        break;
      default:
        break;
    }
  });

  tilebar.addEventListener('input', (e) => e.target.setAttribute("value", e.target.value));
  
  sidebar.addEventListener('input', (e) => {
    let elem = e.target;
    switch(elem.id) {
      case 'btn-import': 
      importTiles(elem.files);
      toggleSidebar();
        break;
      case 'bg-image': loadImage(elem.files);
        break;
      case 'accent-color1': settings.accentColor1 = elem.value;
        break;
      case 'accent-color2': settings.accentColor2 = elem.value;
        break;
      case 'tiles-opacity': changeOpacity(elem.value);
        break;
      case 'tiles-rounded':
      case 'tiles-bordered':
      case 'tiles-rotated':
      case 'tiles-shadow':
      case 'tiles-blur':
        changeStyle(elem);
        break;
      case 'cell-size': changeSize(elem.value);
        break;
      case 'grid-align-h': changeAlignment(elem.value, Directions.Horizontal);
        break;
      case 'grid-align-v': changeAlignment(elem.value, Directions.Vertical);
        break;
      case 'grid-cols': changeColumns(elem.value);
        break;
      case 'grid-gap': changeGap(elem.value);
        break;
      case 'night-mode':      
        document.body.dataset.nightMode = elem.checked;
        settings.nightMode = elem.checked;
        break;
      case 'daily-image':      
        document.body.dataset.dailyImage = elem.checked;
        settings.dailyImage = elem.checked;
        break;
      default:
        break;
    }
    elem.setAttribute("value", elem.value);
  });
  
  sidebar.addEventListener('transitionend', (e) => {
    if(sidebar.dataset.action == States.Show)
      sidebar.querySelector("#sidebar-header > button[name='btn-back']").focus();
    else
      btnMenu.focus();
  });
  
  tilebar.addEventListener('transitionend', (e) => {
    if(tilebar.dataset.action == States.Hide)
      btnAdd.focus();
  });
  
  function onUpdate(tile) {
    console.log(tile.id);
  }
  
  async function getTiles() {
    try {
      //let arrTiles = await db.tiles.where("id").between(0, 25).toArray();
      let arrTiles = await db.tiles.toArray();
      if (arrTiles && arrTiles.length > 0) {
        arrTiles.sort((a, b) => a.position - b.position);
        arrTiles.forEach((tile) => { changeTile(tile); addTile(tile); });
      }
      else
        tiles.dataset.action = States.Edit;
      console.log("Плитки успешно загружены:", arrTiles);
    } 
    catch (error) {
      console.error("Ошибка при загрузке плиток: ", error);
    }
  }
  
  async function saveTiles(arrTiles) {
    try {
      if (arrTiles && arrTiles.length >= 0) {
        db.tiles.clear();
        await db.tiles.bulkPut(arrTiles);
      }
    } 
    catch (error) {
      console.error("Ошибка при сохранении плиток: ", error);
    }
  }
  
  function parseTile(element) {
    let tile = new Tile(element.id);
    let title = element.querySelector(".front span");
    let description = element.querySelector(".back span");
    tile.title = title ? title.textContent : "";
    tile.description = description ? description.textContent : "";
    let location = element.querySelector(".flipper input[name='location']");
    tile.location = location ? location.value : "";
    tile.color = element.dataset.color;
    tile.style = element.dataset.style;
    tile.size = new Size(element.dataset.colSpan, element.dataset.rowSpan);
    tile.position = Array.prototype.slice.call(tiles.children).indexOf(element);
    return tile;
  }
  function parseTiles() {
    let arrTiles = [];
    let elements = tiles.querySelectorAll(".tile");
    elements.forEach((element) => arrTiles.push(parseTile(element)));
    return arrTiles;
  }
  
  function parseTileFromTilebar() {
    let id = tilebar.querySelector("#tile-id").value;
    let tile = new Tile(id);
    tile.position = tilebar.querySelector("#tile-position").value;
    tile.title = tilebar.querySelector("#tile-title").value.trim();
    tile.location = tilebar.querySelector("#tile-location").value.trim();
    tile.description = tilebar.querySelector("#tile-description").value.trim();
    tile.size = new Size(tilebar.querySelector("#tile-width").value, tilebar.querySelector("#tile-height").value);
    let hexColor = tilebar.querySelector("#tile-color").value;
    let alphaHex = Number(tilebar.querySelector("#tile-opacity").value).toString(16);
    if (alphaHex.length == 1)
      alphaHex = alphaHex.padStart(2, '0');
    let color = new Color(hexColor + alphaHex);
    tile.color = color.toHEXAString();
    
    applyStyle(tile, States.Edit);

    return tile;
  }
  
  function applyStyle(elem, state) {
    for (const prop in Styles) {
      if (Styles.hasOwnProperty(prop)) {
        let style = `${prop.toLowerCase()}`;
        const isChecked = tilebar.querySelector(`#tile-${style}`).checked;
        if (state == States.Add) {
          if (isChecked) {
            elem.dataset.style |= Styles[prop];
            elem.children[0].classList.add(style);
          } 
          else {
            elem.dataset.style &= ~Styles[prop];
            elem.children[0].classList.remove(style);
          }
        } 
        else if (state == States.Edit) {
          if (isChecked)
            elem.style |= Styles[prop];
          else 
            elem.style &= ~Styles[prop];
        }
      }
    }
  }
  
  function exportTiles() {
    let arrTiles = parseTiles();
    if(arrTiles.length > 0) {
      const json = JSON.stringify(arrTiles, null, 2);
      //const bytes = new TextEncoder().encode(json);
      const blob = new Blob([json], {type: "application/json;charset=utf-8"});
      const link = sidebar.querySelector("#sidebar-header a[name='btn-export']");
      let dataurl = URL.createObjectURL(blob);
      link.setAttribute('href', dataurl);
      link.setAttribute('download', `tiles.json`);
      //URL.revokeObjectURL(dataurl);
    }
    else
      alert("No data to download...");
  }

  function loadImage(files) {
    if(files && files.length > 0)  {
      const reader = new FileReader();
      reader.onload = (e) => document.body.style.backgroundImage = `url('${e.target.result}')`;
      reader.readAsDataURL(files[0]);
    }
  }

  function saveImage() {
      const bg = document.body.style.backgroundImage;
      if (bg && bg !== 'none')
        settings.bgImage = bg.replace(/url\(["']?/, '').replace(/["']?\)/, '');
      else
        console.log('Нет подходящего изображения для сохранения.');
  }

  function importTiles(files) {
    if(files && files.length > 0)  {
      const elems = tiles.querySelectorAll(".tile");
      elems.forEach((elem) => elem.remove());
      
      let dataurl = window.URL.createObjectURL(files[0]);
      let getJSON = function(url, callback) {
        var xmlhttprequest = new XMLHttpRequest();
        xmlhttprequest.open('GET', url, true);
        xmlhttprequest.responseType = 'json';
        xmlhttprequest.onload = function() {
          var status = xmlhttprequest.status;
          if (status == 200)
            callback(null, xmlhttprequest.response);
          else
            callback(status, xmlhttprequest.response);
        };
        xmlhttprequest.send();
      };
  
      getJSON(dataurl, function(err, arr) {
        if (err != null)
          console.error(err);
        else {
          arr.forEach((tile) => addTile(tile));
        }
      });
      URL.revokeObjectURL(dataurl);
    }
  }
  function toggleSidebar() {
    sidebar.dataset.action = sidebar.dataset.action == States.Show ? States.Hide : States.Show;
  }
  function toggleTilebar() {
    if (tilebar.dataset.action == States.Add || tilebar.dataset.action == States.Edit)
      tilebar.dataset.action = States.Hide;
  }
  function togglePreset(elem) {
    let divTile = elem.closest('.tile');
    if(divTile != null) {
      if(divTile.dataset.preset == null)
        divTile.dataset.preset = '';
      else
        delete divTile.dataset.preset;
    }
  }
  function updateBackground() {
    //let url = 'https://source.unsplash.com/collection/641219';
    const accessKey ="F3Lq5bwhNJdj_SbtRdcoMWaU2uW0Qd3iqeTrp9kXQOI";
    const url = `https://api.unsplash.com/photos/random?client_id=${accessKey}`;
    fetch(url)
      .then(response => {
        if (!response.ok)
          throw new Error('Ошибка сети');
        return response.json();
      })
      .then(data => {
        const imageUrl = data.urls.regular; // Получаем URL изображения
        document.body.style.backgroundImage = `url(${imageUrl})`; // Устанавливаем фоновое изображение
      })
      .catch(error => console.error('Ошибка получения изображения:', error));
  }
  
  //updateBackground();
  //setInterval(updateBackground, 24 * 60 * 60 * 1000); // 24 часа в миллисекундах
  
  function updateInput(elem, val) {
    elem.value = val;
    elem.setAttribute("value", val);
  }

  function guid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  function getFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } 
    catch {
      return "";
    }
  }
  
  function Enum(obj)
  {
    const newObj = {};
    for(const prop in obj) {
      if (obj.hasOwnProperty(prop))
        newObj[prop] = String(obj[prop]);
    }
    return Object.freeze(newObj);
  }
  })();