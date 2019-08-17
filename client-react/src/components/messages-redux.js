import { connect } from 'react-redux';
import Messages from './messages';
import { Actions } from '../actions'

const mapStateToProps = state => {
  return {
    online: state.online,
    messages: state.messages,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onRefreshClick: () => {
      dispatch(Actions.dismissAllMessages())
    },
    onDismissClick: id => {
        dispatch(Actions.dismissMessage(id))
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Messages);

