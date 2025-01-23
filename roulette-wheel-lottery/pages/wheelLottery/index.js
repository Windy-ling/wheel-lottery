Page({
  data: {
    prizes: [
      { name: '奖品1', image: './imgs/1.jpg' },
      { name: '奖品2', image: './imgs/2.jpg' },
      { name: '奖品3', image: './imgs/3.jpg' },
      { name: '奖品4', image: './imgs/4.jpg' },
      { name: '奖品5', image: './imgs/5.jpg' },
      { name: '奖品6', image: './imgs/6.jpg' },
      // { name: '奖品6', image: './imgs/6.jpg' },
    ],
    rotateAngle: 0,
    isRotating: false,
    canvasWidth: 300, // 固定画布宽度
    canvasHeight: 300, // 固定画布高度
    wheelRadius: 125, // 固定轮盘半径
  },



  onReady() {
    this.initWheel();
  },

  initWheel() {
    const query = wx.createSelectorQuery();
    query.select('#wheelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = this.data.canvasWidth * dpr;
        canvas.height = this.data.canvasHeight * dpr;
        ctx.scale(dpr, dpr);

        this.canvas = canvas;
        this.ctx = ctx;


        // 创建离屏 canvas
        this.offscreenCanvas = wx.createOffscreenCanvas({
          type: '2d',
          width: this.data.canvasWidth,
          height: this.data.canvasHeight
        });
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        // 预加载图片
        this.preloadImages().then(() => {
          this.drawWheel();
        });
      });
  },

  async preloadImages() {
    const imagePromises = this.data.prizes.map(prize => {
      return new Promise((resolve, reject) => {
        const img = this.canvas.createImage();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = prize.image;
      });
    });

    this.prizeImages = await Promise.all(imagePromises);
  },

  drawWheel() {
    const ctx = this.ctx;
    const centerX = this.data.canvasWidth / 2;
    const centerY = this.data.canvasHeight / 2;
    const radius = this.data.wheelRadius;

    ctx.save();
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    ctx.translate(centerX, centerY);
    ctx.rotate((this.data.rotateAngle * Math.PI) / 180);

    const prizes = this.data.prizes;
    const anglePerPrize = (2 * Math.PI) / prizes.length;

    for (let i = 0; i < prizes.length; i++) {
      // 绘制扇形
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, i * anglePerPrize, (i + 1) * anglePerPrize);
      ctx.closePath();

      ctx.fillStyle = '#ffc107';//背景色
      ctx.fill();
      // 绘制边框
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制文字
      ctx.save();
      ctx.rotate(i * anglePerPrize + anglePerPrize / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333';
      ctx.font = '16px Arial';


      const textRadius = radius * 0.5; // 文字位于半径的中点

      // 旋转文字使其垂直于半径
      ctx.rotate(Math.PI / 2);

      ctx.fillText(prizes[i].name, 0, -textRadius);
      // // 绘制图片
      if (this.prizeImages[i]) {
        const imgSize = radius * 0.2;//图片的尺寸
        const imgRadius = radius * 1.2;//离圆心的距离

        // 将图片绘制在文字上方，保持在同一条径向线上
        ctx.translate(0, -(imgRadius - textRadius));
        ctx.drawImage(this.prizeImages[i], -imgSize / 2, -imgSize / 2, imgSize, imgSize);
      }
      ctx.restore();
      this.drawPearls(ctx, i, anglePerPrize, radius);
    }

    ctx.restore();
  },
  drawPearls(ctx, sectorIndex, anglePerPrize, radius) {
    const pearlRadius = 5;
    const pearlDistance = radius + 15; // 珠子距离圆盘边缘的距离

    // 绘制中心线上的珠子
    const centerAngle = sectorIndex * anglePerPrize + anglePerPrize / 2;
    this.drawPearl(ctx, centerAngle, pearlDistance, pearlRadius);

    // 绘制左边界的珠子
    this.drawPearl(ctx, sectorIndex * anglePerPrize, pearlDistance, pearlRadius);

    // 绘制右边界的珠子
    this.drawPearl(ctx, (sectorIndex + 1) * anglePerPrize, pearlDistance, pearlRadius);
  },

  drawPearl(ctx, angle, distance, radius) {
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff'; // 珠子的颜色
    ctx.fill();
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.stroke();
  },
  startLottery() {
    if (this.data.isRotating) return;

    this.setData({ isRotating: true });

    const randomAngle = Math.floor(Math.random() * 360) + 720; // 至少旋转两圈
    const totalAngle = this.data.rotateAngle + randomAngle;

    const animateRotation = (currentAngle, endAngle, startTime) => {
      const now = Date.now();
      const timeElapsed = now - startTime;
      const progress = Math.min(timeElapsed / 5000, 1); // 5000ms for full rotation
      const easedProgress = this.easeOutCubic(progress);
      const newAngle = currentAngle + (endAngle - currentAngle) * easedProgress;

      this.setData({ rotateAngle: newAngle });
      this.drawWheel();

      if (progress < 1) {
        setTimeout(() => animateRotation(currentAngle, endAngle, startTime), 16); // 约60fps
      } else {
        this.showResult();
      }
    };

    setTimeout(() => animateRotation(this.data.rotateAngle, totalAngle, Date.now()), 0);
  },

  easeOutCubic(t) {//转盘速度函数
    return 1 - Math.pow(1 - t, 3);
  },

  showResult() {
    const prizesCount = this.data.prizes.length;
    const anglePerPrize = 360 / prizesCount;

    // 计算指针（12点方向）对应的角度
    // 需要加90度，因为第一个奖品在3点钟方向（0度）
    let pointerAngle = (630 - (this.data.rotateAngle % 360)) % 360;

    // 如果指针角度正好在分界线上，稍微调整以确保落入某个奖品区域
    if (pointerAngle % anglePerPrize === 0) {
      pointerAngle += anglePerPrize / 3;
    }

    // 计算中奖索引
    const winIndex = Math.floor(pointerAngle / anglePerPrize);

    const prize = this.data.prizes[winIndex];
    console.log('winIndex', winIndex);
    console.log('prize', prize);

    wx.showModal({
      title: '恭喜',
      content: `您抽中了${prize.name}！`,
      showCancel: false,
      success: () => {
        this.setData({ isRotating: false });
      }
    });
  }
});