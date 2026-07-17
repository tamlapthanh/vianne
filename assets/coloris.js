$(document).ready(function () {

Coloris({
    el: '.coloris',
    swatches: [
      'Tomato',
      'Orange',
      'DodgerBlue',
      'MediumSeaGreen',
      'Gray',
      'SlateBlue',
      'Violet',
      'LightGray',
      '#0096c7',
      '#00b4d8',
      '#48cae4'
    ]
  });
  
  Coloris.setInstance('.instance1', {
    // theme: 'pill',
    // themeMode: 'dark',
    // formatToggle: true,
    closeButton: true,
    clearButton: true,
    swatches: [
'#00FFFF','#000000','#0000FF','#FF00FF','#808080','#008000','#00FF00','#800000','#000080','#808000','#800080','#FF0000','#C0C0C0','#008080','#FFFFFF','#FFFF00'
    ]
  });
  
  Coloris.setInstance('.instance2', { theme: 'polaroid' });

  Coloris.setInstance('.instance3', {
    theme: 'polaroid',
    swatchesOnly: true
  });

  // document.addEventListener('coloris:pick', event => {
  //   line_color = event.detail.color;
  //   console.log('New color', line_color);
  // });

});