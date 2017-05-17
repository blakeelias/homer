FlowRouter.route('/invite/:inviteId', {
    action: function(params, queryParams) {
        console.log("Yeah! We are on the post:", params.inviteId);
    }
});