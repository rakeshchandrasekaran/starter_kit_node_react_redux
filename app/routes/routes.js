
router.get('/all-events', mustRevalidate, (req, res, next) => {
    homeSnapshotService.getHomeSnapshot(req.session, req.context)
      .then(homeSnapshot => {
        return res.json( homeSnapshot );
      })
      .catch(err => {
        next(err);
      });
  });